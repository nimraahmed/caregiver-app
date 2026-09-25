import { describe, expect, it } from "vitest";
import raw from "@/data/cards.json";
import { validateCards } from "../schema";

describe("T11 cards.json", () => {
  it("passes schema and referential checks", () => {
    const cards = validateCards(raw);
    expect(cards).toHaveLength(28);
    expect(cards.every((c) => c.source.title && c.source_tier)).toBe(true);
    expect(cards.filter((c) => c.source_status === "needs_source")).toEqual([]);
    expect(cards.every((c) => c.source.url && c.source.quote)).toBe(true);
  });

  it("rejects duplicate ids, unknown supersedes, chains and prefix mismatch", () => {
    const base = (raw as unknown[])[0] as Record<string, unknown>;
    expect(() => validateCards([base, base])).toThrow(/duplicate/);
    expect(() => validateCards([{ ...base, supersedes: ["NOPE-01"] }])).toThrow(/unknown card/);
    expect(() => validateCards([{ ...base, id: "ST-FOOT-01" }])).toThrow(/ST- cards/);
    const a = { ...base, id: "X-A-01", conditions: ["t2dm", "stroke"], supersedes: ["X-B-01"] };
    const b = { ...base, id: "X-B-01", conditions: ["t2dm", "stroke"], supersedes: ["DM-FOOT-01"] };
    expect(() => validateCards([a, b, base])).toThrow(/chain/);
  });
});
