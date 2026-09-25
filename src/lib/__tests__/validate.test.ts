import { describe, expect, it } from "vitest";
import { CARDS } from "../cards";
import { selectCards } from "../rules";
import { mergePlan, planOutputSchema, sanitizeContext, toParseResult, parseOutputSchema, isProtected } from "../validate";
import { DEMO, profile } from "./fixtures";

const selected = selectCards(DEMO, CARDS);
const byId = (id: string) => selected.find((c) => c.id === id)!;
const echo = (overrides: Record<string, Partial<Record<string, unknown>>> = {}) =>
  planOutputSchema.parse({
    summary: "Focus on the bathroom he uses at night.",
    cards: selected.map((c) => ({ id: c.id, order: c.order, urgency: c.urgency, action: c.action, why: c.why, steps: ["Do it", "Check it"], ...overrides[c.id] })),
  });

describe("mergePlan (F11)", () => {
  it("T5: drops unknown ids, rejects lowered urgency, caps raises at one tier", () => {
    const out = echo({ "ST-BATH-03": { urgency: "when_you_can" }, "DM-FOOT-05": { urgency: "this_week" } });
    out.cards.push({ id: "DM-FAKE-99", action: "Buy a robot", why: "x", steps: [] });
    const plan = mergePlan(selected, out);
    expect(plan.cards.find((c) => c.id === "DM-FAKE-99")).toBeUndefined();
    expect(plan.cards.find((c) => c.id === "ST-BATH-03")!.urgency).toBe(byId("ST-BATH-03").urgency);
    const foot5 = byId("DM-FOOT-05");
    const merged = plan.cards.find((c) => c.id === "DM-FOOT-05")!;
    const tiers = ["this_week", "this_month", "when_you_can"];
    expect(tiers.indexOf(merged.urgency)).toBe(Math.max(0, tiers.indexOf(foot5.urgency) - 1));
    expect(plan.cards).toHaveLength(selected.length);
  });

  it("T9: re-inserts omitted cards with stored text", () => {
    const out = echo();
    out.cards = out.cards.filter((c) => c.id !== "ST-BED-01");
    const plan = mergePlan(selected, out);
    const bed = plan.cards.find((c) => c.id === "ST-BED-01")!;
    expect(bed.why).toBe(byId("ST-BED-01").why);
    expect(bed.tailored).toBe(false);
    expect(bed.steps).toEqual([]);
  });

  it("T12: medication step and brand action revert to stored text, other fields kept", () => {
    const out = echo({
      "DM-FOOT-01": { action: "Buy Philips slippers from Amazon for the hallway", steps: ["Give 500 mg paracetamol first", "Check the hallway floor each evening"], why: "Numb feet cannot feel a sharp object on the floor." },
    });
    const c = mergePlan(selected, out).cards.find((c) => c.id === "DM-FOOT-01")!;
    expect(c.action).toBe(byId("DM-FOOT-01").action);
    expect(c.steps).toEqual(["Check the hallway floor each evening"]);
    expect(c.why).toBe("Numb feet cannot feel a sharp object on the floor.");
  });

  it("protected cards keep the stored action; contradicting steps dropped", () => {
    const out = echo({
      "ST-BATH-02": { action: "Keep taking standing showers", steps: ["Continue standing showers if he refuses the seat", "Try the seat once with Maria present"] },
      "ST-ROUT-01": { action: "Lay out tomorrow's clothes before Maria leaves at 6pm" },
    });
    const plan = mergePlan(selected, out);
    const bath = plan.cards.find((c) => c.id === "ST-BATH-02")!;
    expect(isProtected(bath)).toBe(true);
    expect(bath.action).toBe(byId("ST-BATH-02").action);
    expect(bath.steps).toEqual(["Try the seat once with Maria present"]);
    const liv = plan.cards.find((c) => c.id === "ST-ROUT-01")!;
    expect(isProtected(liv)).toBe(false);
    expect(liv.action).toBe("Lay out tomorrow's clothes before Maria leaves at 6pm");
  });

  it("T13: hide ignored on protected cards (feet, bathroom, fall-risk), kept on unprotected cards", () => {
    const out = planOutputSchema.parse({
      summary: "",
      cards: selected.map((c) => ({ id: c.id, hide_suggested: ["DM-FOOT-01", "ST-BATH-01", "ST-ROUT-01"].includes(c.id), hide_reason: "Does not apply here" })),
    });
    const plan = mergePlan(selected, out);
    expect(plan.cards.find((c) => c.id === "DM-FOOT-01")!.hide_suggested).toBe(false);
    expect(plan.cards.find((c) => c.id === "ST-BATH-01")!.hide_suggested).toBe(false);
    expect(plan.cards.find((c) => c.id === "ST-ROUT-01")!.hide_suggested).toBe(true);
    expect(plan.cards.find((c) => c.id === "ST-ROUT-01")!.hide_reason).toBe("Does not apply here");
    const visSelected = selectCards(profile({ vision_reduced: true, stairs_used_daily: true }), CARDS);
    for (const c of [...selected, ...visSelected].filter((c) => c.room === "bathroom" || c.fall_risk || c.id.includes("-FOOT-"))) expect(isProtected(c)).toBe(true);
  });

  it("caps field lengths and drops owner_note on patient-owned cards", () => {
    const out = echo({ "DM-FOOT-04": { action: "x".repeat(141), owner_note: "Maria after the shower" }, "ST-BATH-01": { steps: ["a", "b", "c", "d"] } });
    const plan = mergePlan(selected, out);
    expect(plan.cards.find((c) => c.id === "DM-FOOT-04")!.action).toBe(byId("DM-FOOT-04").action);
    expect(plan.cards.find((c) => c.id === "DM-FOOT-04")!.owner_note).toBeNull();
    expect(plan.cards.find((c) => c.id === "ST-BATH-01")!.steps).toHaveLength(3);
  });

  it("T6: null output yields the untailored plan", () => {
    const plan = mergePlan(selected, null);
    expect(plan.tailored).toBe(false);
    expect(plan.cards.map((c) => c.id)).toEqual(selected.map((c) => c.id));
  });
});

describe("parse output (F2, T15)", () => {
  it("T15: medication phrases never reach context chips", () => {
    const ctx = sanitizeContext({ routine: ["takes metformin 500mg after breakfast", "showers at night"], other: ["was diagnosed last year"], people: ["helper Maria leaves at 6pm"] });
    expect(JSON.stringify(ctx)).not.toMatch(/metformin|diagnosed/);
    expect(ctx.routine).toEqual(["showers at night"]);
    expect(ctx.people).toEqual(["helper Maria leaves at 6pm"]);
  });

  it("keeps only non-null fields with evidence", () => {
    const out = parseOutputSchema.parse({
      fields: { conditions: ["t2dm", "stroke"], weak_side: "left", walks: "with_aid", foot_numbness: null, caregiver: "both" },
      evidence: { weak_side: "left side weak", walks: "uses a stick" },
      context: { layout: ["bedroom upstairs"] },
    });
    const r = toParseResult(out);
    expect(r.fields).toEqual({ conditions: ["t2dm", "stroke"], weak_side: "left", walks: "with_aid", caregiver: "both" });
    expect(r.evidence).toEqual({ weak_side: "left side weak", walks: "uses a stick" });
    expect(r.context.layout).toEqual(["bedroom upstairs"]);
  });
});
