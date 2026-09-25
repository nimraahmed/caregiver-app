import type { Profile } from "./types";

export const EMERGENCY_NUMBER = "998";

export const STROKE_FLAG = {
  title: "These can be signs of a new stroke.",
  body: `Call ${EMERGENCY_NUMBER} now.`,
  ack: "I have called for help",
};

export const FOOT_WOUND_FLAG = {
  body: "A sore, cut or blister on the foot of someone with diabetes needs to be seen by a doctor or foot specialist within 24 hours.",
};

export interface RedFlags {
  stroke: boolean;
  footWound: boolean;
}

/** Deterministic only — never influenced by LLM output. */
export function redFlags(profile: Pick<Profile, "new_stroke_signs" | "open_foot_wound" | "conditions">): RedFlags {
  return {
    stroke: profile.new_stroke_signs === true,
    footWound: profile.open_foot_wound === true && profile.conditions.includes("t2dm"),
  };
}
