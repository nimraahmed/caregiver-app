import { EMERGENCY_NUMBER } from "./redflags";

export const REFUSAL_TEXT = `I can't advise on that — please ask their doctor or nurse. If this is urgent, call ${EMERGENCY_NUMBER}.`;

const MEDICATION = String.raw`\b(\d+\s?(mg|ml|mcg|units?|iu)|mg|tablets?|pills?|capsules?|insulin|metformin|dos(e|es|age|ing)|prescri\w*|medic(ine|ines|ation|ations)|drug|paracetamol|panadol|aspirin|warfarin|statins?|inject\w*)\b`;
const DIET = String.raw`\b(diet|calorie|calories|carbs?|carbohydrates?|sugar intake|what (should|can) (he|she|they) eat|eat(ing)? (more|less)|portion|fasting|keto|low[- ]salt|meal plan)\b`;
const EXERCISE = String.raw`\b(exercise(s)?|workout|physio(therapy)? exercises|how many steps|walk \d+ minutes|stretch(es|ing) plan)\b`;
const DIAGNOSIS = String.raw`\b(is (this|it|that) a stroke|is (this|it|that) (an? )?(emergency|infection|ulcer|blood clot)|diagnos\w*|symptom\w*|blood (sugar|pressure) (level|reading|of)|hba1c|glucose|what('s| is) wrong with|prognosis|will (he|she|they) recover|life expectancy)\b`;
const BRANDS = String.raw`\b(amazon|noon|ikea|carrefour|dragon ?mart|ace hardware|home ?centre|philips|osram|bosch|3m|grohe|kohler|toto|aed\s?\d+|\$\s?\d+|\d+\s?(aed|dirhams?|usd|dollars?))\b`;

export const MEDICAL_QUESTION_RE = new RegExp(`${MEDICATION}|${DIET}|${EXERCISE}|${DIAGNOSIS}`, "i");
export const GENERATED_TEXT_RE = new RegExp(`${MEDICATION}|${DIET}|${BRANDS}`, "i");
const CONTEXT_MEDICAL_RE = new RegExp(`${MEDICATION}|${DIAGNOSIS}|\b(diagnosed|hospital(ised|ized)?|surgery|operation|blood|wound|ulcer|swelling|pain)\b`, "i");

/** True when a user chat message asks for medical advice — answered with REFUSAL_TEXT, no model call. */
export function isMedicalQuestion(text: string): boolean {
  return MEDICAL_QUESTION_RE.test(text);
}

/** True when LLM-generated plan text contains medication/diet/brand/price content and must revert to stored text. */
export function violatesGeneratedText(text: string): boolean {
  return GENERATED_TEXT_RE.test(text);
}

/** Wording that accepts, excuses or works around not doing a plan card. */
export const CONTRADICTION_RE =
  /\b(continue|carry on|keep on|no need|not (needed|necessary)|don'?t (need|have) to|skip|optional|only (if|when)|instead of|instead|work(ing)? around|as safe as possible|without (a|the) (seat|chair|rail|rails|aid|stick|frame)|since (he|she|they) (refuses?|won'?t|declines?)|if (he|she|they) (refuses?|prefers?|declines?|insists?)|(?<!no )standing showers?)\b/i;

export function acceptsRefusal(text: string): boolean {
  return CONTRADICTION_RE.test(text);
}

/** Wording that presents a home change as letting someone who needs help to move manage unsupervised. */
export const UNSUPERVISED_RE =
  /\b(without (waiting|needing|help|you|assistance|anyone|supervision)|(on|by) (his|her|their|them)?\s?(own|self|selves)|by (him|her|them)self|independently|unaided|alone safely|manage (the )?(toilet|shower|bath|transfers?|stairs) (safely )?(on|by)|no longer needs? (help|you)|reduce[sd]? the need (to wait|for help))\b/i;

export function impliesUnsupervised(text: string): boolean {
  return UNSUPERVISED_RE.test(text);
}

/** Context chips must be non-medical facts about the home and routine. */
export function isMedicalContext(text: string): boolean {
  return CONTEXT_MEDICAL_RE.test(text);
}
