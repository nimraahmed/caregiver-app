import { describe, expect, it } from "vitest";
import { CARDS } from "../cards";
import { isMedicalQuestion, REFUSAL_TEXT, violatesGeneratedText } from "../guard";

describe("chat guard (T14)", () => {
  it.each(["how much insulin should he take", "is this a stroke?", "what should he eat", "can he skip his tablets", "how many mg of paracetamol"])("refuses %s", (q) => {
    expect(isMedicalQuestion(q)).toBe(true);
  });
  it.each(["He refuses to sit in the shower — what now?", "Which of these should we do this weekend?", "How do we fit this around the night shower?"])("allows %s", (q) => {
    expect(isMedicalQuestion(q)).toBe(false);
  });
  it("refusal text is fixed", () => {
    expect(REFUSAL_TEXT).toBe("I can't advise on that — please ask their doctor or nurse. If this is urgent, call 998.");
  });
});

describe("generated-text guard", () => {
  it("flags medication, diet, brand and price", () => {
    for (const s of ["Give 500 mg paracetamol", "Buy from IKEA", "Costs AED 40", "Start a low-salt diet"]) expect(violatesGeneratedText(s)).toBe(true);
  });
  it("never flags stored card text", () => {
    for (const c of CARDS) {
      expect(violatesGeneratedText(c.action)).toBe(false);
      expect(violatesGeneratedText(c.why)).toBe(false);
    }
  });
});
