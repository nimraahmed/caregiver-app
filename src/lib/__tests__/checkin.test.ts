import { describe, expect, it } from "vitest";
import { CARDS } from "../cards";
import { daysSince, EMPTY_CHECKIN, summarizeCheckIn } from "../checkin";
import { selectCards } from "../rules";
import { buildSummaryText, checkInLines, flagLines, profileFacts, summaryRows } from "../summary";
import { DEMO, profile } from "./fixtures";

const cards = selectCards(DEMO, CARDS);

describe("30-day check-in", () => {
  it("counts done items per urgency and the This-week percentage", () => {
    const week = cards.filter((c) => c.urgency === "this_week").map((c) => c.id);
    const s = summarizeCheckIn(cards, { done: week.slice(0, 2) });
    expect(s.total).toBe(cards.length);
    expect(s.done).toBe(2);
    expect(s.by_urgency.this_week.done).toBe(2);
    expect(s.week_pct).toBe(Math.round((2 / week.length) * 100));
    expect(s.outstanding).toHaveLength(cards.length - 2);
  });

  it("ignores ids that are not in the plan and handles no This-week items", () => {
    expect(summarizeCheckIn(cards, { done: ["NOPE-01"] }).done).toBe(0);
    expect(summarizeCheckIn([], { done: [] }).week_pct).toBeNull();
  });

  it("computes whole days since the plan was created", () => {
    const now = new Date("2026-02-01T12:00:00Z");
    expect(daysSince(null, now)).toBeNull();
    expect(daysSince("not a date", now)).toBeNull();
    expect(daysSince("2026-01-02T00:00:00Z", now)).toBe(30);
    expect(daysSince("2026-02-02T00:00:00Z", now)).toBe(0);
  });
});

describe("care-team summary", () => {
  it("lists only the fields relevant to the selected conditions", () => {
    const labels = (p: Parameters<typeof profileFacts>[0]) => profileFacts(p).map((f) => f.label);
    expect(labels(profile({ conditions: ["t2dm"] }))).not.toContain("Weaker side");
    expect(labels(profile({ conditions: ["stroke"] }))).not.toContain("Reduced foot sensation");
    expect(labels(DEMO)).toEqual(expect.arrayContaining(["Weaker side", "Reduced foot sensation", "Help at home"]));
  });

  it("reports red flags deterministically", () => {
    expect(flagLines(DEMO)).toEqual([]);
    expect(flagLines(profile({ ...DEMO, open_foot_wound: true }))).toHaveLength(1);
    expect(flagLines(profile({ conditions: ["stroke"], open_foot_wound: true }))).toEqual([]);
    expect(flagLines(profile({ ...DEMO, new_stroke_signs: true }))[0]).toMatch(/998/);
  });

  it("uses stored card wording, urgency order, deterministic responsibility and the source", () => {
    const rows = summaryRows(cards, DEMO, null);
    expect(rows.map((r) => r.id)).toEqual(expect.arrayContaining(cards.map((c) => c.id)));
    expect(rows[0].urgency).toBe("This week");
    expect(rows.every((r) => r.done === null)).toBe(true);
    const foot = rows.find((r) => r.id === "X-FOOT-01")!;
    expect(foot.responsible).toBe("The helper");
    expect(foot.source).toMatch(/IWGDF/);
    const rails = rows.find((r) => r.id === "ST-BATH-01")!;
    expect(rails.responsible).toBe("Family");
  });

  it("includes the check-in only once it has been saved", () => {
    expect(checkInLines(cards, EMPTY_CHECKIN)).toEqual([]);
    expect(summaryRows(cards, DEMO, { ...EMPTY_CHECKIN, done: [cards[0].id] })[0].done).toBeNull();
    const saved = { done: [cards[0].id], falls: "1" as const, near_falls: false, saved_at: "2026-02-01T10:00:00Z" };
    const lines = checkInLines(cards, saved);
    expect(lines[0]).toMatch(new RegExp(`^1 of ${cards.length} plan items done`));
    expect(lines).toEqual(expect.arrayContaining([expect.stringMatching(/Falls .*: One/), "Near-falls or trips: No"]));
    const text = buildSummaryText(DEMO, cards, saved, "2026-01-02T00:00:00Z");
    expect(text).toContain("30-day check-in");
    expect(text).toContain(`[x] This week · ${cards[0].action}`);
    expect(text).toContain("nothing here is a clinical assessment");
  });
});
