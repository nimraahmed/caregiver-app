import type { Caregiver, Card } from "./types";

export type Responsible = "patient" | "family" | "helper";

const LABEL: Record<Responsible, string> = {
  patient: "The person themselves",
  family: "Family",
  helper: "The helper",
};

/**
 * Who carries a card out. Ownership comes from the library; when a paid helper lives in, daily
 * hands-on routines go to them while buying and fitting things stays with the family.
 */
export function responsibleFor(card: Pick<Card, "owner" | "kind">, caregiver: Caregiver): Responsible {
  if (card.owner === "patient") return "patient";
  const hasHelper = caregiver === "live_in_helper" || caregiver === "both";
  return hasHelper && card.kind === "daily_routine" ? "helper" : "family";
}

export function responsibleLabel(r: Responsible): string {
  return LABEL[r];
}

const WHO_RE =
  /\b(who does what|who (should|will|needs? to|has to|is going to|is supposed to) (do|handle|take care of|be responsible for|look after) (what|which|each|these|them|all this|the (tasks|items|list|things))|whose (job|task|responsibility) is (what|each|which)|(divide|split|share|assign) (up )?(the |these )?(tasks|work|jobs|responsibilities|items|list)|which (\w+ ){0,3}(should|can|will|does|do|must) [\w' ]{1,20}\b(do|handle)\b.*\b(which|what|and) [\w' ]{1,25}\b(do|handle)\b)/i;

export function asksWhoDoesWhat(text: string): boolean {
  return WHO_RE.test(text);
}

/** Deterministic split of the visible cards by responsible party. */
export function whoDoesWhat(cards: Pick<Card, "owner" | "kind" | "action">[], caregiver: Caregiver): string {
  const groups: Record<Responsible, string[]> = { helper: [], family: [], patient: [] };
  for (const c of cards) groups[responsibleFor(c, caregiver)].push(c.action);
  const lines: string[] = [];
  for (const r of ["helper", "family", "patient"] as const) {
    if (groups[r].length) lines.push(`${LABEL[r]}:\n${groups[r].map((a) => `• ${a}`).join("\n")}`);
  }
  const note =
    caregiver === "live_in_helper" || caregiver === "both"
      ? "Buying, fitting rails and lights and learning about the condition stay with the family; the helper covers the daily checks and routines."
      : caregiver === "none"
        ? "Nobody is listed as helping at home, so the family items need someone to be arranged — ask the nurse or social worker."
        : "";
  return [...lines, note].filter(Boolean).join("\n\n");
}
