import { describe, expect, it } from "vitest";
import { CARDS } from "../cards";
import { acceptsRefusal, hasUnsupportedTiming, impliesUnsupervised, isMedicalQuestion, proposesWorkaround, REFUSAL_TEXT, violatesGeneratedText } from "../guard";
import { asksWhoDoesWhat, responsibleFor, whoDoesWhat } from "../responsibility";
import { selectCards } from "../rules";
import { DEMO, profile } from "./fixtures";

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

describe("refusal-acceptance guard", () => {
  it("flags wording that works around a refused card", () => {
    expect(acceptsRefusal("Since he refuses the shower seat, focus on making a standing shower as safe as possible")).toBe(true);
    expect(acceptsRefusal("Continue standing showers if he refuses the seat")).toBe(true);
    expect(acceptsRefusal("Use grab rails instead of a seat")).toBe(true);
  });
  it("allows stored card text and introduction advice", () => {
    for (const c of CARDS) expect(acceptsRefusal(c.action)).toBe(false);
    expect(acceptsRefusal("Use a shower seat; no standing showers. Try it once with Maria present.")).toBe(false);
  });
});

describe("unsupervised-mobility guard", () => {
  it("flags wording that lets a non-walker manage alone", () => {
    expect(impliesUnsupervised("Fit grab rails so he can use the toilet without waiting for you")).toBe(true);
    expect(impliesUnsupervised("These changes reduce the need to wait for you")).toBe(true);
    expect(impliesUnsupervised("He can then shower on his own")).toBe(true);
  });
  it("allows stored card text", () => {
    for (const c of CARDS) expect(impliesUnsupervised(c.action + " " + c.why)).toBe(false);
  });
});

describe("invented-timing guard", () => {
  it("flags frequencies, weekdays and clock times the household never mentioned", () => {
    expect(hasUnsupportedTiming("Caregiver trims nails weekly", "Cut toenails straight across")).toBe(true);
    expect(hasUnsupportedTiming("Trim on Saturday", "helper leaves at 6pm")).toBe(true);
    expect(hasUnsupportedTiming("Install rails before 5pm", "helper Maria leaves at 6pm")).toBe(true);
  });
  it("allows timings taken from the card or the family's own words", () => {
    expect(hasUnsupportedTiming("Maria does it before 6pm", "helper Maria leaves at 6pm")).toBe(false);
    expect(hasUnsupportedTiming("Check feet daily each morning", "Check both feet daily")).toBe(false);
    expect(hasUnsupportedTiming("Rosa trims them weekly", "Rosa cuts his nails weekly")).toBe(false);
    for (const c of CARDS) expect(hasUnsupportedTiming(c.action + " " + c.why, "")).toBe(false);
  });
});

describe("chat workaround guard is narrower than the step guard", () => {
  it("lets a reply restate a refusal without proposing a workaround", () => {
    expect(proposesWorkaround("If she insists on the stairs herself, keep the light on and stay within reach.")).toBe(false);
    expect(proposesWorkaround("Since he refuses the seat, try it once with Maria present.")).toBe(false);
  });
  it("still catches replies that drop a card", () => {
    expect(proposesWorkaround("Continue with the standing showers for now")).toBe(true);
    expect(proposesWorkaround("The rail is optional if she is steady")).toBe(true);
    expect(proposesWorkaround("Use a towel instead of the grab rail")).toBe(true);
  });
});

describe("who does what (deterministic)", () => {
  it("splits routines to the helper and fitting to the family", () => {
    const cards = selectCards(profile({ ...DEMO, caregiver: "live_in_helper" }), CARDS);
    expect(responsibleFor(cards.find((c) => c.id === "X-FOOT-01")!, "live_in_helper")).toBe("helper");
    expect(responsibleFor(cards.find((c) => c.id === "ST-BATH-01")!, "live_in_helper")).toBe("family");
    expect(responsibleFor(cards.find((c) => c.id === "X-FOOT-01")!, "family")).toBe("family");
    expect(responsibleFor(cards.find((c) => c.id === "DM-FOOT-07")!, "both")).toBe("patient");
    const answer = whoDoesWhat(cards, "live_in_helper");
    expect(answer).toMatch(/^The helper:/);
    expect(answer).toContain("Family:");
  });
  it("recognises the question", () => {
    expect(asksWhoDoesWhat("Who does what here?")).toBe(true);
    expect(asksWhoDoesWhat("who should do which of these")).toBe(true);
    expect(asksWhoDoesWhat("Which of these should Jenny do and which should I do?")).toBe(true);
    expect(asksWhoDoesWhat("Which should I do first?")).toBe(false);
    expect(asksWhoDoesWhat("He forgets the stick - how do we get him to use it?")).toBe(false);
  });
});
