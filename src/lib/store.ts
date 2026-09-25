"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { Profile } from "./types";
import type { TailoredPlan } from "./validate";

export const EMPTY_PROFILE: Profile = {
  conditions: [],
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
  alone_hours_per_day: "0",
  open_foot_wound: false,
  new_stroke_signs: false,
  free_text: "",
  context: null,
};

export interface AppState {
  profile: Profile;
  /** Questions the user has explicitly answered (by question id). */
  answered: string[];
  strokeFlagAcknowledged: boolean;
  /** LLM evidence quotes for pre-filled fields, keyed by profile field. */
  evidence: Record<string, string>;
  /** The free text that was last sent to /api/parse, so we do not re-parse unchanged text. */
  parsedText: string;
  /** Cached /api/plan result for the profile hash it was computed for. */
  plan: { key: string; plan: TailoredPlan; fallback: boolean } | null;
  /** Card ids the user chose to reveal after a hide suggestion. */
  revealed: string[];
}

const KEY = "hac-state-v1";
const INITIAL: AppState = { profile: EMPTY_PROFILE, answered: [], strokeFlagAcknowledged: false, evidence: {}, parsedText: "", plan: null, revealed: [] };

let cache: AppState | null = null;
const listeners = new Set<() => void>();

function read(): AppState {
  if (cache) return cache;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<AppState>) : {};
    cache = { ...INITIAL, ...parsed, profile: { ...EMPTY_PROFILE, ...(parsed.profile ?? {}) } };
  } catch {
    cache = INITIAL;
  }
  return cache;
}

function write(next: AppState) {
  cache = next;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage unavailable (private mode) — keep in-memory state
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

const SERVER_SNAPSHOT: AppState | null = null;

export function useAppState() {
  const snapshot = useSyncExternalStore(subscribe, read, () => SERVER_SNAPSHOT);
  const hydrated = snapshot !== null;
  const state = snapshot ?? INITIAL;

  const update = useCallback((fn: (s: AppState) => AppState) => write(fn(read())), []);

  const setProfile = useCallback(
    (patch: Partial<Profile>, questionId?: string) =>
      update((s) => ({
        ...s,
        profile: { ...s.profile, ...patch },
        // An explicit answer replaces the parsed one, so its quote no longer applies.
        evidence: Object.fromEntries(Object.entries(s.evidence).filter(([field]) => !(field in patch) || patch[field as keyof Profile] === s.profile[field as keyof Profile])),
        strokeFlagAcknowledged:
          "new_stroke_signs" in patch && patch.new_stroke_signs !== s.profile.new_stroke_signs ? false : s.strokeFlagAcknowledged,
        answered: questionId && !s.answered.includes(questionId) ? [...s.answered, questionId] : s.answered,
      })),
    [update],
  );

  const reset = useCallback(() => {
    window.sessionStorage.removeItem(KEY);
    write(INITIAL);
  }, []);

  return { state, hydrated, update, setProfile, reset };
}
