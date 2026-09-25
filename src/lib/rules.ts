import { matchAll, matchAny } from "./match";
import {
  ROOM_ORDER,
  URGENCY_ORDER,
  type Card,
  type Profile,
  type SelectedCard,
  type Urgency,
} from "./types";

function raiseOneTier(u: Urgency): Urgency {
  const i = URGENCY_ORDER.indexOf(u);
  return URGENCY_ORDER[Math.max(0, i - 1)];
}

export function urgencyRank(u: Urgency): number {
  return URGENCY_ORDER.indexOf(u);
}

function bumpReason(profile: Profile, card: Card): string | undefined {
  const limitedMobility = profile.walks === "with_help" || profile.walks === "not_walking";
  if (limitedMobility && (card.room === "bathroom" || card.room === "stairs_entrance")) {
    return "Raised because they need help to get around";
  }
  if (profile.alone_hours_per_day === "5+" && card.fall_risk) {
    return "Raised because they are alone 5+ hours a day";
  }
  return undefined;
}

function defaultSortKey(c: SelectedCard): [number, number, number, number, string] {
  return [
    c.id.startsWith("X-") ? 0 : 1,
    c.reassigned ? 0 : 1,
    c.fall_risk ? 0 : 1,
    ROOM_ORDER.indexOf(c.room),
    c.id,
  ];
}

function compareKeys(a: ReturnType<typeof defaultSortKey>, b: ReturnType<typeof defaultSortKey>): number {
  for (let i = 0; i < a.length; i++) {
    if (a[i] < b[i]) return -1;
    if (a[i] > b[i]) return 1;
  }
  return 0;
}

/** Pure rules engine: condition filter → triggers → supersedes → reassign → urgency bump → default sort. */
export function selectCards(profile: Profile, cards: Card[]): SelectedCard[] {
  // 1–2. Condition and trigger filters
  const kept: { card: Card; unsure: boolean }[] = [];
  for (const card of cards) {
    // G- (general home safety) cards apply to any household; every other card needs all its conditions.
    const conditionsOk = card.id.startsWith("G-")
      ? card.conditions.some((c) => profile.conditions.includes(c))
      : card.conditions.every((c) => profile.conditions.includes(c));
    if (!conditionsOk) continue;
    const m = matchAll(profile, card.triggers);
    if (!m.matched) continue;
    kept.push({ card, unsure: m.unsure });
  }

  // 3. Supersedes — over the kept set only
  const superseded = new Set<string>();
  for (const { card } of kept) for (const s of card.supersedes ?? []) superseded.add(s);
  const survivors = kept.filter(({ card }) => !superseded.has(card.id));

  // 4–5. Reassign and urgency bump
  const selected: SelectedCard[] = survivors.map(({ card, unsure }) => {
    const reassigned = card.owner === "patient" && matchAny(profile, card.reassign_if);
    const reason = bumpReason(profile, card);
    const urgency = reason ? raiseOneTier(card.urgency) : card.urgency;
    return {
      ...card,
      owner: reassigned ? "caregiver" : card.owner,
      reassigned,
      reassigned_reason: reassigned ? card.reassign_reason : undefined,
      urgency,
      urgency_bumped_reason: reason && urgency !== card.urgency ? reason : undefined,
      unsure_note: unsure,
      order: 0,
    };
  });

  // 6. Deterministic default sort: tier, then X- → reassigned → fall_risk → room → id
  selected.sort((a, b) => {
    const t = urgencyRank(a.urgency) - urgencyRank(b.urgency);
    if (t !== 0) return t;
    return compareKeys(defaultSortKey(a), defaultSortKey(b));
  });
  const tierCounters = new Map<Urgency, number>();
  for (const c of selected) {
    const n = tierCounters.get(c.urgency) ?? 0;
    c.order = n;
    tierCounters.set(c.urgency, n + 1);
  }
  return selected;
}

export function splitPlan(cards: SelectedCard[]) {
  return {
    homeChanges: cards.filter((c) => c.kind === "home_change"),
    routine: cards.filter((c) => c.kind === "daily_routine"),
  };
}

export function softNotice(profile: Profile): string | null {
  if (profile.caregiver === "none" && profile.walks !== "independently") {
    return "Living alone with limited mobility raises fall risk. Consider asking your local health centre about home-care or a personal alarm.";
  }
  return null;
}
