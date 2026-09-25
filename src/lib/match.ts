import { SAFETY_FIELDS, type Condition, type Profile } from "./types";

export interface MatchResult {
  matched: boolean;
  /** True when the match relied on a "Not sure" (null) safety-field answer. */
  unsure: boolean;
}

export function matchCondition(profile: Profile, cond: Condition): MatchResult {
  const value = profile[cond.field];
  switch (cond.op) {
    case "eq":
      return { matched: value === cond.value, unsure: false };
    case "neq":
      return { matched: value !== cond.value, unsure: false };
    case "in":
      return { matched: cond.value.includes(value), unsure: false };
    case "truthy": {
      if (value === null && SAFETY_FIELDS.includes(cond.field)) return { matched: true, unsure: true };
      return { matched: Boolean(value), unsure: false };
    }
  }
}

/** AND over a list of conditions. Empty list matches. */
export function matchAll(profile: Profile, conds: Condition[] | undefined): MatchResult {
  let unsure = false;
  for (const c of conds ?? []) {
    const r = matchCondition(profile, c);
    if (!r.matched) return { matched: false, unsure: false };
    unsure = unsure || r.unsure;
  }
  return { matched: true, unsure };
}

/** OR over groups, AND within each group. Undefined/empty never matches. */
export function matchAny(profile: Profile, groups: Condition[][] | undefined): boolean {
  return (groups ?? []).some((g) => matchAll(profile, g).matched);
}
