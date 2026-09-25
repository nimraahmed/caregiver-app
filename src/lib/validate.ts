import { z } from "zod";
import { acceptsRefusal, isMedicalContext, violatesGeneratedText } from "./guard";
import { householdContextSchema, profileSchema } from "./schema";
import { URGENCY_ORDER, type HouseholdContext, type Profile, type SelectedCard, type Urgency } from "./types";

// ---------- /api/parse ----------

const tri = z.boolean().nullable().optional();
export const PARSE_FIELDS = [
  "conditions",
  "foot_numbness",
  "vision_reduced",
  "weak_side",
  "walks",
  "grip_difficulty",
  "memory_or_attention_issues",
  "swallowing_issues",
  "home_type",
  "stairs_used_daily",
  "bathroom_type",
  "caregiver",
  "alone_hours_per_day",
  "open_foot_wound",
  "new_stroke_signs",
] as const;
export type ParseField = (typeof PARSE_FIELDS)[number];

export const parseOutputSchema = z.object({
  fields: z
    .object({
      conditions: z.array(z.enum(["t2dm", "stroke"])).nullable().optional(),
      foot_numbness: tri,
      vision_reduced: tri,
      weak_side: z.enum(["left", "right", "both", "unknown"]).nullable().optional(),
      walks: z.enum(["independently", "with_aid", "with_help", "not_walking"]).nullable().optional(),
      grip_difficulty: tri,
      memory_or_attention_issues: tri,
      swallowing_issues: tri,
      home_type: z.enum(["apartment", "villa"]).nullable().optional(),
      stairs_used_daily: tri,
      bathroom_type: z.enum(["shower", "bathtub", "both"]).nullable().optional(),
      caregiver: z.enum(["family", "live_in_helper", "both", "none"]).nullable().optional(),
      alone_hours_per_day: z.enum(["0", "1-4", "5+"]).nullable().optional(),
      open_foot_wound: tri,
      new_stroke_signs: tri,
    })
    .partial(),
  evidence: z.record(z.string(), z.string().nullable()).optional().default({}),
  context: householdContextSchema.partial().optional().default({}),
});
export type ParseOutput = z.infer<typeof parseOutputSchema>;

export type ParsedFields = Partial<Pick<Profile, ParseField>>;

export interface ParseResult {
  fields: ParsedFields;
  evidence: Partial<Record<ParseField, string>>;
  context: HouseholdContext;
}

export const EMPTY_CONTEXT: HouseholdContext = { layout: [], routine: [], people: [], preferences: [], other: [] };

/** Drops medical phrases, dedupes, caps length and count per bucket. */
export function sanitizeContext(raw: Partial<HouseholdContext> | null | undefined): HouseholdContext {
  const clean = (arr: string[] | undefined) => {
    const out: string[] = [];
    for (const s of arr ?? []) {
      const t = s.trim().replace(/\s+/g, " ").slice(0, 90);
      if (!t || isMedicalContext(t) || out.some((o) => o.toLowerCase() === t.toLowerCase())) continue;
      out.push(t);
      if (out.length >= 6) break;
    }
    return out;
  };
  return {
    layout: clean(raw?.layout),
    routine: clean(raw?.routine),
    people: clean(raw?.people),
    preferences: clean(raw?.preferences),
    other: clean(raw?.other),
  };
}

export function contextIsEmpty(ctx: HouseholdContext | null | undefined): boolean {
  return !ctx || Object.values(ctx).every((a) => a.length === 0);
}

/** Converts validated model output into profile patch + evidence; only non-null fields are kept. */
export function toParseResult(out: ParseOutput): ParseResult {
  const fields: ParsedFields = {};
  const evidence: Partial<Record<ParseField, string>> = {};
  for (const f of PARSE_FIELDS) {
    const v = out.fields[f];
    if (v === null || v === undefined) continue;
    if (f === "conditions" && Array.isArray(v) && v.length === 0) continue;
    (fields as Record<string, unknown>)[f] = v;
    const q = out.evidence[f];
    if (typeof q === "string" && q.trim()) evidence[f] = q.trim().slice(0, 160);
  }
  return { fields, evidence, context: sanitizeContext(out.context) };
}

// ---------- /api/plan ----------

export const planOutputSchema = z.object({
  summary: z.string().optional().default(""),
  cards: z.array(
    z.object({
      id: z.string(),
      order: z.number().optional(),
      urgency: z.enum(["this_week", "this_month", "when_you_can"]).optional(),
      urgency_raised_reason: z.string().nullable().optional(),
      action: z.string().optional(),
      why: z.string().optional(),
      steps: z.array(z.string()).optional(),
      owner_note: z.string().nullable().optional(),
      hide_suggested: z.boolean().optional(),
      hide_reason: z.string().nullable().optional(),
    }),
  ),
});
export type PlanOutput = z.infer<typeof planOutputSchema>;

export interface TailoredCard extends SelectedCard {
  original_action: string;
  original_why: string;
  tailored: boolean;
  steps: string[];
  owner_note: string | null;
  urgency_raised_reason: string | null;
  hide_suggested: boolean;
  hide_reason: string | null;
}

export interface TailoredPlan {
  summary: string | null;
  cards: TailoredCard[];
  tailored: boolean;
}

const LIMITS = { action: 140, why: 200, step: 120, steps: 3, note: 120, reason: 120, summary: 320 };

export function isProtected(card: SelectedCard): boolean {
  return card.fall_risk || card.room === "bathroom" || card.id.includes("-FOOT-") || card.unsure_note;
}

function safeText(value: string | null | undefined, max: number): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  if (!t || t.length > max || violatesGeneratedText(t)) return null;
  return t;
}

function safeStep(value: string, max: number): string | null {
  const t = safeText(value, max);
  return t && !acceptsRefusal(t) ? t : null;
}

/** Plain rules output wrapped as a plan, used when the LLM is unavailable. */
export function untailoredPlan(selected: SelectedCard[]): TailoredPlan {
  return {
    summary: null,
    tailored: false,
    cards: selected.map((c) => ({
      ...c,
      original_action: c.action,
      original_why: c.why,
      tailored: false,
      steps: [],
      owner_note: null,
      urgency_raised_reason: null,
      hide_suggested: false,
      hide_reason: null,
    })),
  };
}

/**
 * Merges LLM output onto the server-computed selection. The selection is authoritative:
 * unknown ids are dropped, omitted cards are re-inserted with stored text, urgency can rise by
 * at most one tier and never fall, protected cards cannot be hidden, and any generated string
 * that is too long or trips the keyword guard reverts to stored text.
 */
export function mergePlan(selected: SelectedCard[], out: PlanOutput | null): TailoredPlan {
  if (!out) return untailoredPlan(selected);
  const byId = new Map(out.cards.map((c) => [c.id, c] as const));
  const cards: TailoredCard[] = selected.map((c) => {
    const o = byId.get(c.id);
    const base = untailoredPlan([c]).cards[0];
    if (!o) return base;

    // Safety cards keep their source-backed action verbatim; tailoring goes into why/steps/owner note.
    const action = isProtected(c) ? null : safeStep(o.action ?? "", LIMITS.action);
    const why = safeText(o.why, LIMITS.why);
    const steps = (o.steps ?? []).map((s) => safeStep(s, LIMITS.step)).filter((s): s is string => s !== null).slice(0, LIMITS.steps);
    const ownerNote = c.owner === "caregiver" ? safeText(o.owner_note, LIMITS.note) : null;

    let urgency: Urgency = c.urgency;
    let raisedReason: string | null = null;
    if (o.urgency && o.urgency !== c.urgency) {
      const from = URGENCY_ORDER.indexOf(c.urgency);
      const to = URGENCY_ORDER.indexOf(o.urgency);
      if (to < from) {
        urgency = URGENCY_ORDER[Math.max(to, from - 1)];
        raisedReason = safeText(o.urgency_raised_reason, LIMITS.reason) ?? "Raised for this household";
      }
    }

    const hide = o.hide_suggested === true && !isProtected(c);
    return {
      ...base,
      action: action ?? c.action,
      why: why ?? c.why,
      tailored: action !== null || why !== null || steps.length > 0,
      steps,
      owner_note: ownerNote,
      urgency,
      urgency_raised_reason: raisedReason,
      hide_suggested: hide,
      hide_reason: hide ? safeText(o.hide_reason, LIMITS.reason) : null,
      order: typeof o.order === "number" && Number.isFinite(o.order) ? o.order : c.order + 1000,
    };
  });

  // Deterministic sort within tier: X- and reassigned cards keep precedence, then model order, then rules order.
  cards.sort((a, b) => {
    const t = URGENCY_ORDER.indexOf(a.urgency) - URGENCY_ORDER.indexOf(b.urgency);
    if (t) return t;
    const ax = a.id.startsWith("X-") ? 0 : a.reassigned ? 1 : 2;
    const bx = b.id.startsWith("X-") ? 0 : b.reassigned ? 1 : 2;
    if (ax !== bx) return ax - bx;
    if (a.order !== b.order) return a.order - b.order;
    return a.id.localeCompare(b.id);
  });

  return { summary: safeText(out.summary, LIMITS.summary), cards, tailored: true };
}

// ---------- /api/chat ----------

/** Cards are identified only; the server recomputes them from the profile so client text never reaches the model as trusted grounding. */
export const chatRequestSchema = z.object({
  profile: profileSchema,
  card_ids: z.array(z.string().max(20)).max(30),
  steps: z.record(z.string().max(20), z.array(z.string().max(LIMITS.step)).max(LIMITS.steps)).optional().default({}),
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(600) })).min(1).max(12),
});
export type ChatRequest = z.infer<typeof chatRequestSchema>;
