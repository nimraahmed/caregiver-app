import type { Profile } from "../types";

export const BASE: Profile = {
  conditions: ["t2dm"],
  foot_numbness: null,
  vision_reduced: null,
  weak_side: "none",
  walks: "independently",
  grip_difficulty: false,
  memory_or_attention_issues: false,
  swallowing_issues: false,
  home_type: "apartment",
  stairs_used_daily: false,
  bathroom_type: "shower",
  caregiver: "family",
  alone_hours_per_day: "1-4",
  open_foot_wound: false,
  new_stroke_signs: false,
  free_text: "",
  context: null,
};

/** Daughter, father 64, Dubai apartment. T2DM numb feet, eyesight fine; stroke, left weak; stick; shower; no stairs; family + helper; alone 1–4h. */
export const DEMO: Profile = {
  ...BASE,
  conditions: ["t2dm", "stroke"],
  foot_numbness: true,
  vision_reduced: false,
  weak_side: "left",
  walks: "with_aid",
  caregiver: "both",
};

export function profile(overrides: Partial<Profile>): Profile {
  return { ...BASE, ...overrides };
}
