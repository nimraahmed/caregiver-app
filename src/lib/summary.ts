import { CHECKIN_DAY, type CheckIn, FALLS_LABEL, summarizeCheckIn } from "./checkin";
import { LABELS } from "./questions";
import { redFlags } from "./redflags";
import { responsibleFor, responsibleLabel } from "./responsibility";
import type { Profile, SelectedCard, Urgency } from "./types";
import { URGENCY_ORDER } from "./types";

/**
 * Clinician-facing discharge summary. Built only from the typed profile and the stored
 * (source-backed) card text — never from LLM-tailored wording or extracted context.
 */

const URGENCY: Record<Urgency, string> = { this_week: "This week", this_month: "This month", when_you_can: "When you can" };

function tri(v: boolean | null): string {
  return v === null ? "Not sure" : v ? "Yes" : "No";
}

export interface SummaryFact {
  label: string;
  value: string;
}

export function profileFacts(p: Profile): SummaryFact[] {
  const t2dm = p.conditions.includes("t2dm");
  const stroke = p.conditions.includes("stroke");
  const facts: SummaryFact[] = [
    { label: "Conditions", value: p.conditions.map((c) => LABELS.conditions[c]).join(", ") },
    { label: "Mobility", value: LABELS.walks[p.walks] },
  ];
  if (stroke) {
    facts.push({ label: "Weaker side", value: p.weak_side === "none" ? "None" : LABELS.weak_side[p.weak_side] });
    facts.push({ label: "Grip difficulty", value: p.grip_difficulty ? "Yes" : "No" });
    facts.push({ label: "Memory or attention", value: p.memory_or_attention_issues ? "Affected" : "Not reported" });
    facts.push({ label: "Swallowing", value: p.swallowing_issues ? "Affected" : "Not reported" });
  }
  if (t2dm) {
    facts.push({ label: "Reduced foot sensation", value: tri(p.foot_numbness) });
    facts.push({ label: "Reduced vision", value: tri(p.vision_reduced) });
  }
  facts.push(
    { label: "Home", value: `${LABELS.home_type[p.home_type]}, ${LABELS.bathroom_type[p.bathroom_type].toLowerCase()}${p.stairs_used_daily ? ", stairs used daily" : ""}` },
    { label: "Help at home", value: LABELS.caregiver[p.caregiver] },
    { label: "Alone per day", value: LABELS.alone_hours_per_day[p.alone_hours_per_day] },
  );
  return facts;
}

export function flagLines(p: Profile): string[] {
  const f = redFlags(p);
  const lines: string[] = [];
  if (f.stroke) lines.push("Caregiver reported possible new stroke signs at intake; the app directed them to call 998.");
  if (f.footWound) lines.push("Caregiver reported an open foot sore, cut or blister; the app advised review within 24 hours.");
  return lines;
}

export interface SummaryRow {
  id: string;
  action: string;
  room: string;
  urgency: string;
  responsible: string;
  source: string;
  done: boolean | null;
}

export function summaryRows(cards: SelectedCard[], p: Profile, checkin: CheckIn | null): SummaryRow[] {
  const done = checkin?.saved_at ? new Set(checkin.done) : null;
  return [...cards]
    .sort((a, b) => URGENCY_ORDER.indexOf(a.urgency) - URGENCY_ORDER.indexOf(b.urgency) || a.order - b.order)
    .map((c) => ({
      id: c.id,
      action: c.action,
      room: c.room,
      urgency: URGENCY[c.urgency],
      responsible: responsibleLabel(responsibleFor(c, p.caregiver)),
      source: c.source.title + (c.source.section ? ` — ${c.source.section}` : ""),
      done: done ? done.has(c.id) : null,
    }));
}

export function checkInLines(cards: SelectedCard[], checkin: CheckIn | null): string[] {
  if (!checkin?.saved_at) return [];
  const s = summarizeCheckIn(cards, checkin);
  const lines = [`${s.done} of ${s.total} plan items done` + (s.week_pct !== null ? ` (${s.week_pct}% of "This week" items)` : "")];
  if (checkin.falls) lines.push(`Falls reported in the last ${CHECKIN_DAY} days: ${FALLS_LABEL[checkin.falls]}`);
  if (checkin.near_falls !== null) lines.push(`Near-falls or trips: ${checkin.near_falls ? "Yes" : "No"}`);
  lines.push(`Recorded ${new Date(checkin.saved_at).toLocaleDateString("en-GB")}`);
  return lines;
}

export function buildSummaryText(p: Profile, cards: SelectedCard[], checkin: CheckIn | null, createdAt: string | null): string {
  const out: string[] = ["HOME ADAPTATION PLAN — SUMMARY FOR THE CARE TEAM"];
  if (createdAt) out.push(`Plan created ${new Date(createdAt).toLocaleDateString("en-GB")}`);
  out.push("", "Household (caregiver-reported)");
  for (const f of profileFacts(p)) out.push(`- ${f.label}: ${f.value}`);
  const flags = flagLines(p);
  if (flags.length) out.push("", "Flags", ...flags.map((l) => `- ${l}`));
  const ci = checkInLines(cards, checkin);
  if (ci.length) out.push("", "30-day check-in", ...ci.map((l) => `- ${l}`));
  out.push("", "Recommended home changes and routines");
  for (const r of summaryRows(cards, p, checkin)) {
    out.push(`- [${r.done === null ? " " : r.done ? "x" : " "}] ${r.urgency} · ${r.action} (${r.responsible}) — ${r.source}`);
  }
  out.push(
    "",
    "Generated from the caregiver's answers. Items come from public guidance (IWGDF 2023, NICE NG236, NHS, Stroke Association and others) selected by fixed rules; nothing here is a clinical assessment or medical advice.",
  );
  return out.join("\n");
}
