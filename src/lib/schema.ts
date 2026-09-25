import { z } from "zod";
import type { Card, Profile, ProfileField } from "./types";

export const PROFILE_FIELDS: ProfileField[] = [
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
  "free_text",
  "context",
];

const fieldSchema = z.enum(PROFILE_FIELDS as [ProfileField, ...ProfileField[]]);

export const conditionSchema = z.union([
  z.object({ field: fieldSchema, op: z.enum(["eq", "neq"]), value: z.unknown() }),
  z.object({ field: fieldSchema, op: z.literal("in"), value: z.array(z.unknown()) }),
  z.object({ field: fieldSchema, op: z.literal("truthy") }),
]);

export const cardSchema = z.object({
  id: z.string().regex(/^(DM|ST|X)-[A-Z]+-\d{2}$/),
  conditions: z.array(z.enum(["t2dm", "stroke"])).min(1),
  triggers: z.array(conditionSchema).optional(),
  reassign_if: z.array(z.array(conditionSchema).min(1)).optional(),
  reassign_reason: z.string().optional(),
  room: z.enum(["bedroom", "bathroom", "kitchen", "living", "stairs_entrance", "whole_home", "routine"]),
  kind: z.enum(["home_change", "daily_routine"]),
  action: z.string().min(1),
  why: z.string().min(1),
  owner: z.enum(["patient", "caregiver"]),
  urgency: z.enum(["this_week", "this_month", "when_you_can"]),
  cost: z.enum(["free", "low", "medium", "high"]),
  fall_risk: z.boolean(),
  supersedes: z.array(z.string()).optional(),
  source: z.object({
    title: z.string().min(1),
    section: z.string().optional(),
    url: z.string().url().optional(),
    quote: z.string().optional(),
  }),
  source_tier: z.enum(["guideline", "health_service", "patient_org", "product_logic"]),
  source_status: z.enum(["verified", "needs_source"]),
});

export const householdContextSchema = z.object({
  layout: z.array(z.string()),
  routine: z.array(z.string()),
  people: z.array(z.string()),
  preferences: z.array(z.string()),
  other: z.array(z.string()),
});

const tri = z.boolean().nullable();

export const profileSchema: z.ZodType<Profile> = z.object({
  conditions: z.array(z.enum(["t2dm", "stroke"])).min(1),
  foot_numbness: tri,
  vision_reduced: tri,
  weak_side: z.enum(["left", "right", "both", "none", "unknown"]),
  walks: z.enum(["independently", "with_aid", "with_help", "not_walking"]),
  grip_difficulty: z.boolean(),
  memory_or_attention_issues: z.boolean(),
  swallowing_issues: z.boolean(),
  home_type: z.enum(["apartment", "villa"]),
  stairs_used_daily: z.boolean(),
  bathroom_type: z.enum(["shower", "bathtub", "both"]),
  caregiver: z.enum(["family", "live_in_helper", "both", "none"]),
  alone_hours_per_day: z.enum(["0", "1-4", "5+"]),
  open_foot_wound: z.boolean(),
  new_stroke_signs: z.boolean(),
  free_text: z.string().max(500),
  context: householdContextSchema.nullable(),
});

/** Validates the card library: schema plus referential rules. Throws with all problems listed. */
export function validateCards(raw: unknown): Card[] {
  const cards = z.array(cardSchema).parse(raw) as Card[];
  const errors: string[] = [];
  const ids = new Set<string>();
  const superseded = new Set<string>();

  for (const c of cards) {
    if (ids.has(c.id)) errors.push(`${c.id}: duplicate id`);
    ids.add(c.id);
    const prefix = c.id.split("-")[0];
    if (prefix === "X" && c.conditions.length !== 2) errors.push(`${c.id}: X- cards must list both conditions`);
    if (prefix === "DM" && (c.conditions.length !== 1 || c.conditions[0] !== "t2dm")) errors.push(`${c.id}: DM- cards must list only t2dm`);
    if (prefix === "ST" && (c.conditions.length !== 1 || c.conditions[0] !== "stroke")) errors.push(`${c.id}: ST- cards must list only stroke`);
    if (c.reassign_if && !c.reassign_reason) errors.push(`${c.id}: reassign_if without reassign_reason`);
    if (c.kind === "daily_routine" && c.room !== "routine") errors.push(`${c.id}: daily_routine cards must use room "routine"`);
    for (const s of c.supersedes ?? []) {
      if (s === c.id) errors.push(`${c.id}: supersedes itself`);
      superseded.add(s);
    }
  }
  for (const c of cards) {
    for (const s of c.supersedes ?? []) {
      if (!ids.has(s)) errors.push(`${c.id}: supersedes unknown card ${s}`);
    }
    if (c.supersedes?.length && superseded.has(c.id)) errors.push(`${c.id}: supersede chain (superseded card also supersedes)`);
  }
  if (errors.length) throw new Error(`cards.json invalid:\n${errors.join("\n")}`);
  return cards;
}
