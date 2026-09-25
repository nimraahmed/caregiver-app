import type { AppState } from "./store";
import type { Profile } from "./types";
import type { ParseResult } from "./validate";

type ParseResponse = ({ fallback: true } | ({ fallback: false } & ParseResult)) | { error: string };

/** Drops everything derived from a previous description (context, evidence, cached plan). */
export function clearParsed(s: AppState, text: string): AppState {
  return { ...s, profile: { ...s.profile, context: null }, evidence: {}, parsedText: text, plan: null };
}

/**
 * Sends the free text to /api/parse and merges the result into state.
 * Explicit answers win: conditions the user ticked are never changed, and fields already
 * answered on a later screen are left alone. Household context replaces the previous one.
 */
export async function applyParse(text: string, update: (fn: (s: AppState) => AppState) => void): Promise<void> {
  if (!text.trim()) {
    update((s) => clearParsed(s, text));
    return;
  }
  let res: ParseResponse | null = null;
  try {
    const r = await fetch("/api/parse", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) });
    res = (await r.json()) as ParseResponse;
  } catch {
    res = null;
  }

  update((s) => {
    if (!res || "error" in res || res.fallback) return clearParsed(s, text);

    const patch: Partial<Profile> = {};
    const evidence: Record<string, string> = {};
    const stroke = s.profile.conditions.includes("stroke");
    const t2dm = s.profile.conditions.includes("t2dm");

    for (const [field, value] of Object.entries(res.fields) as [keyof ParseResult["fields"], unknown][]) {
      if (field === "conditions") continue;
      if (!stroke && ["weak_side", "grip_difficulty", "memory_or_attention_issues", "swallowing_issues"].includes(field)) continue;
      if (!t2dm && ["foot_numbness", "vision_reduced", "open_foot_wound"].includes(field)) continue;
      if (s.answered.includes(QUESTION_FOR[field])) continue;
      (patch as Record<string, unknown>)[field] = value;
      const q = res.evidence[field];
      if (q) evidence[field] = q;
    }
    if (patch.weak_side === "unknown" && s.profile.weak_side !== "none") delete patch.weak_side;

    return {
      ...s,
      profile: { ...s.profile, ...patch, context: res.context },
      evidence,
      parsedText: text,
      plan: null,
      strokeFlagAcknowledged: patch.new_stroke_signs === true ? false : s.strokeFlagAcknowledged,
    };
  });
}

const QUESTION_FOR: Record<keyof ParseResult["fields"], string> = {
  conditions: "conditions",
  foot_numbness: "foot_numbness",
  vision_reduced: "vision_reduced",
  weak_side: "weak_side",
  walks: "walks",
  grip_difficulty: "stroke_issues",
  memory_or_attention_issues: "stroke_issues",
  swallowing_issues: "stroke_issues",
  home_type: "home",
  stairs_used_daily: "home",
  bathroom_type: "home",
  caregiver: "help",
  alone_hours_per_day: "help",
  night_toilet: "daily",
  barefoot_indoors: "daily",
  cooks_alone: "daily",
  phone_out_of_reach: "daily",
  open_foot_wound: "red_flags",
  new_stroke_signs: "red_flags",
};

export { QUESTION_FOR };
