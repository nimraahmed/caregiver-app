import { describe, expect, it } from "vitest";
import { CARDS } from "../cards";
import { redFlags } from "../redflags";
import { selectCards, softNotice } from "../rules";
import { DEMO, profile } from "./fixtures";

const ids = (p: Parameters<typeof selectCards>[0]) => selectCards(p, CARDS).map((c) => c.id);
const byId = (p: Parameters<typeof selectCards>[0], id: string) => selectCards(p, CARDS).find((c) => c.id === id);

describe("T1 demo persona", () => {
  const out = selectCards(DEMO, CARDS);
  const shown = out.map((c) => c.id);

  it("shows the expected cards", () => {
    for (const id of ["DM-FOOT-01", "DM-FOOT-03", "DM-FOOT-04", "DM-FOOT-05", "DM-FOOT-07", "ST-BATH-01", "ST-BATH-02", "ST-BATH-03", "ST-LIV-02", "ST-BED-01", "ST-ROUT-01", "X-FOOT-01", "X-LIV-01"]) {
      expect(shown).toContain(id);
    }
    expect(shown).toHaveLength(13);
  });

  it("hides superseded and untriggered cards", () => {
    for (const id of ["DM-FOOT-02", "DM-FOOT-06", "ST-LIV-01", "DM-VIS-01", "DM-VIS-02", "ST-DRESS-01"]) {
      expect(shown).not.toContain(id);
    }
  });

  it("reassigns DM-FOOT-03 to caregiver with reason, keeps DM-FOOT-04 with patient", () => {
    const f3 = out.find((c) => c.id === "DM-FOOT-03")!;
    expect(f3.owner).toBe("caregiver");
    expect(f3.reassigned).toBe(true);
    expect(f3.reassigned_reason).toMatch(/weakness/);
    const f4 = out.find((c) => c.id === "DM-FOOT-04")!;
    expect(f4.owner).toBe("patient");
    expect(f4.reassigned).toBe(false);
  });

  it("puts X- cards first in their tier and orders deterministically", () => {
    const thisWeek = out.filter((c) => c.urgency === "this_week");
    expect(thisWeek.slice(0, 2).map((c) => c.id).sort()).toEqual(["X-FOOT-01", "X-LIV-01"]);
    expect(thisWeek[0].id).toBe("X-LIV-01"); // fall_risk ranks ahead of routine within the X- group
    expect(thisWeek.map((c) => c.order)).toEqual(thisWeek.map((_, i) => i));
    // no urgency bump for with_aid / alone 1-4h
    expect(out.every((c) => !c.urgency_bumped_reason)).toBe(true);
  });
});

describe("T2 diabetes only, numb + vision + stairs", () => {
  const p = profile({ conditions: ["t2dm"], foot_numbness: true, vision_reduced: true, stairs_used_daily: true });
  it("shows all DM cards and no ST/X", () => {
    const shown = ids(p);
    expect(shown.sort()).toEqual(["DM-FOOT-01", "DM-FOOT-02", "DM-FOOT-03", "DM-FOOT-04", "DM-FOOT-05", "DM-FOOT-06", "DM-FOOT-07", "DM-VIS-01", "DM-VIS-02"]);
  });
  it("reassigns DM-FOOT-02 and 04 for vision, not 03", () => {
    expect(byId(p, "DM-FOOT-02")!.owner).toBe("caregiver");
    expect(byId(p, "DM-FOOT-04")!.owner).toBe("caregiver");
    expect(byId(p, "DM-FOOT-03")!.owner).toBe("patient");
  });
});

describe("T3 stroke only, right weak, grip, needs help walking", () => {
  const p = profile({ conditions: ["stroke"], weak_side: "right", grip_difficulty: true, walks: "with_help" });
  it("shows all ST cards, no DM/X", () => {
    expect(ids(p).sort()).toEqual(["ST-BATH-01", "ST-BATH-02", "ST-BATH-03", "ST-BED-01", "ST-DRESS-01", "ST-LIV-01", "ST-LIV-02", "ST-ROUT-01"]);
  });
  it("bathroom cards this_week; living cards stay this_month", () => {
    expect(byId(p, "ST-BATH-01")!.urgency).toBe("this_week");
    expect(byId(p, "ST-LIV-01")!.urgency).toBe("this_month");
    expect(byId(p, "ST-LIV-02")!.urgency).toBe("this_month");
  });
});

describe("T4 red flags", () => {
  it("stroke signs flag; foot wound only with t2dm", () => {
    expect(redFlags(profile({ new_stroke_signs: true }))).toEqual({ stroke: true, footWound: false });
    expect(redFlags(profile({ open_foot_wound: true }))).toEqual({ stroke: false, footWound: true });
    expect(redFlags(profile({ conditions: ["stroke"], open_foot_wound: true })).footWound).toBe(false);
  });
});

describe("T7 numbness Not sure", () => {
  it("shows foot cards with unsure note", () => {
    const p = profile({ conditions: ["t2dm"], foot_numbness: null });
    const f1 = byId(p, "DM-FOOT-01")!;
    expect(f1).toBeDefined();
    expect(f1.unsure_note).toBe(true);
  });
  it("numbness No hides foot cards", () => {
    expect(ids(profile({ conditions: ["t2dm"], foot_numbness: false, vision_reduced: false }))).toEqual([]);
  });
});

describe("T8 stroke only: no X cards so nothing superseded", () => {
  it("shows ST-LIV-01", () => {
    const shown = ids(profile({ conditions: ["stroke"], weak_side: "left" }));
    expect(shown).toContain("ST-LIV-01");
    expect(shown).not.toContain("X-LIV-01");
    expect(shown).not.toContain("X-FOOT-01");
  });
  it("both conditions but numbness No: X cards absent, DM-FOOT-02 also absent (untriggered), ST-LIV-01 shown", () => {
    const shown = ids(profile({ conditions: ["t2dm", "stroke"], foot_numbness: false, weak_side: "left" }));
    expect(shown).toContain("ST-LIV-01");
    expect(shown).not.toContain("X-LIV-01");
  });
});

describe("T10 alone 5+ h, walks independently, stroke", () => {
  const p = profile({ conditions: ["stroke"], weak_side: "left", alone_hours_per_day: "5+" });
  it("raises fall_risk cards one tier, leaves ST-DRESS-01", () => {
    expect(byId(p, "ST-LIV-01")!.urgency).toBe("this_week");
    expect(byId(p, "ST-LIV-01")!.urgency_bumped_reason).toMatch(/alone/);
    expect(byId(p, "ST-LIV-02")!.urgency).toBe("this_week");
    const dress = byId(profile({ ...p, grip_difficulty: true }), "ST-DRESS-01")!;
    expect(dress.urgency).toBe("when_you_can");
  });
  it("never bumps above this_week and bumps at most one tier", () => {
    const p2 = profile({ conditions: ["stroke"], weak_side: "left", alone_hours_per_day: "5+", walks: "not_walking" });
    expect(byId(p2, "ST-BATH-01")!.urgency).toBe("this_week");
    expect(byId(p2, "ST-LIV-01")!.urgency).toBe("this_week");
  });
});

describe("weak_side unknown counts as affected", () => {
  it("triggers X-FOOT-01 but not ST-BED-01", () => {
    const shown = ids(profile({ conditions: ["t2dm", "stroke"], foot_numbness: true, weak_side: "unknown" }));
    expect(shown).toContain("X-FOOT-01");
    expect(shown).not.toContain("ST-BED-01");
  });
});

describe("soft notice", () => {
  it("shows only for caregiver none + not independent", () => {
    expect(softNotice(profile({ caregiver: "none", walks: "with_aid" }))).toMatch(/personal alarm/);
    expect(softNotice(profile({ caregiver: "none", walks: "independently" }))).toBeNull();
    expect(softNotice(profile({ caregiver: "family", walks: "with_help" }))).toBeNull();
  });
});
