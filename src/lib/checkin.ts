import type { SelectedCard, Urgency } from "./types";

export type Falls = "0" | "1" | "2+";

export interface CheckIn {
  /** Card ids the caregiver marked as done. */
  done: string[];
  falls: Falls | null;
  near_falls: boolean | null;
  /** ISO timestamp of the last save; null until the first save. */
  saved_at: string | null;
}

export const EMPTY_CHECKIN: CheckIn = { done: [], falls: null, near_falls: null, saved_at: null };

export const FALLS_LABEL: Record<Falls, string> = { "0": "None", "1": "One", "2+": "More than one" };

export const CHECKIN_DAY = 30;

export interface CheckInSummary {
  total: number;
  done: number;
  by_urgency: Record<Urgency, { total: number; done: number }>;
  /** Whole-number percentage of "This week" items done; null when there are none. */
  week_pct: number | null;
  outstanding: SelectedCard[];
}

export function summarizeCheckIn(cards: SelectedCard[], checkin: Pick<CheckIn, "done">): CheckInSummary {
  const doneSet = new Set(checkin.done);
  const by_urgency: CheckInSummary["by_urgency"] = {
    this_week: { total: 0, done: 0 },
    this_month: { total: 0, done: 0 },
    when_you_can: { total: 0, done: 0 },
  };
  for (const c of cards) {
    by_urgency[c.urgency].total += 1;
    if (doneSet.has(c.id)) by_urgency[c.urgency].done += 1;
  }
  const week = by_urgency.this_week;
  return {
    total: cards.length,
    done: cards.filter((c) => doneSet.has(c.id)).length,
    by_urgency,
    week_pct: week.total ? Math.round((week.done / week.total) * 100) : null,
    outstanding: cards.filter((c) => !doneSet.has(c.id)),
  };
}

/** Days since the plan was first shown, or null before it was. */
export function daysSince(createdAt: string | null, now = new Date()): number | null {
  if (!createdAt) return null;
  const start = new Date(createdAt).getTime();
  if (Number.isNaN(start)) return null;
  return Math.max(0, Math.floor((now.getTime() - start) / 86_400_000));
}
