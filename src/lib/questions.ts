import type { Profile } from "./types";

export type QuestionId =
  | "conditions"
  | "free_text"
  | "foot_numbness"
  | "vision_reduced"
  | "weak_side"
  | "walks"
  | "stroke_issues"
  | "home"
  | "help"
  | "red_flags";

export interface Question {
  id: QuestionId;
  title: string;
  hint?: string;
  showWhen?: (p: Profile) => boolean;
}

const hasT2dm = (p: Profile) => p.conditions.includes("t2dm");
const hasStroke = (p: Profile) => p.conditions.includes("stroke");

export const QUESTIONS: Question[] = [
  { id: "conditions", title: "Which conditions does your family member have?", hint: "Choose all that apply." },
  {
    id: "free_text",
    title: "Tell us in your own words (optional)",
    hint: "Tell us about them, their home and a normal day — who's around, where they sleep and wash, what they like and refuse to do. The more you tell us, the more the plan fits your home.",
  },
  { id: "foot_numbness", title: "Do their feet feel numb, tingly or less sensitive?", showWhen: hasT2dm },
  { id: "vision_reduced", title: "Has their eyesight got worse?", showWhen: hasT2dm },
  { id: "weak_side", title: "Which side was weakened by the stroke?", showWhen: hasStroke },
  { id: "walks", title: "How do they get around?" },
  { id: "stroke_issues", title: "Any of these?", hint: "Choose all that apply.", showWhen: hasStroke },
  { id: "home", title: "About the home" },
  { id: "help", title: "Who helps them day to day, and how long are they alone?" },
  { id: "red_flags", title: "Right now, do they have any of these?", hint: "This helps us tell you if something needs urgent attention." },
];

export function visibleQuestions(p: Profile): Question[] {
  return QUESTIONS.filter((q) => !q.showWhen || q.showWhen(p));
}

export const FREE_TEXT_EXAMPLES = [
  "He sleeps upstairs and showers at night.",
  "Our helper leaves at 6pm and I get home at 8.",
  "She refuses to use her walking stick.",
];

export const LABELS = {
  conditions: { t2dm: "Type 2 diabetes", stroke: "Stroke" },
  tri: { true: "Yes", false: "No", null: "Not sure" },
  weak_side: { left: "Left", right: "Right", both: "Both", unknown: "Not sure" },
  walks: { independently: "On their own", with_aid: "With a stick or walker", with_help: "Needs someone's help", not_walking: "Not walking" },
  home_type: { apartment: "Apartment", villa: "Villa" },
  bathroom_type: { shower: "Shower", bathtub: "Bathtub", both: "Both" },
  caregiver: { family: "Family", live_in_helper: "Live-in helper", both: "Both", none: "No one" },
  alone_hours_per_day: { "0": "Never alone", "1-4": "1–4 hours", "5+": "5+ hours" },
} as const;
