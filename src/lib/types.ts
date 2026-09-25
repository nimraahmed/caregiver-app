export type ConditionId = "t2dm" | "stroke";
export type Side = "left" | "right" | "both" | "none" | "unknown";
export type Tri = boolean | null;
export type Walks = "independently" | "with_aid" | "with_help" | "not_walking";
export type Caregiver = "family" | "live_in_helper" | "both" | "none";
export type AloneHours = "0" | "1-4" | "5+";
export type Room =
  | "bedroom"
  | "bathroom"
  | "kitchen"
  | "living"
  | "stairs_entrance"
  | "whole_home"
  | "routine";
export type Kind = "home_change" | "daily_routine";
export type Owner = "patient" | "caregiver";
export type Urgency = "this_week" | "this_month" | "when_you_can";
export type Cost = "free" | "low" | "medium" | "high";
export type SourceTier = "guideline" | "health_service" | "patient_org" | "product_logic";
export type SourceStatus = "verified" | "needs_source";

export interface HouseholdContext {
  layout: string[];
  routine: string[];
  people: string[];
  preferences: string[];
  other: string[];
}

export interface Profile {
  conditions: ConditionId[];
  foot_numbness: Tri;
  vision_reduced: Tri;
  weak_side: Side;
  walks: Walks;
  grip_difficulty: boolean;
  memory_or_attention_issues: boolean;
  swallowing_issues: boolean;
  home_type: "apartment" | "villa";
  stairs_used_daily: boolean;
  bathroom_type: "shower" | "bathtub" | "both";
  caregiver: Caregiver;
  alone_hours_per_day: AloneHours;
  night_toilet: boolean;
  barefoot_indoors: boolean;
  cooks_alone: boolean;
  phone_out_of_reach: boolean;
  open_foot_wound: boolean;
  new_stroke_signs: boolean;
  free_text: string;
  context: HouseholdContext | null;
}

export type ProfileField = keyof Profile;

export type Condition =
  | { field: ProfileField; op: "eq" | "neq"; value: unknown }
  | { field: ProfileField; op: "in"; value: unknown[] }
  | { field: ProfileField; op: "truthy" };

export interface CardSource {
  title: string;
  section?: string;
  url?: string;
  quote?: string;
}

export interface Card {
  id: string;
  conditions: ConditionId[];
  triggers?: Condition[];
  reassign_if?: Condition[][];
  reassign_reason?: string;
  room: Room;
  kind: Kind;
  action: string;
  why: string;
  owner: Owner;
  urgency: Urgency;
  cost: Cost;
  fall_risk: boolean;
  supersedes?: string[];
  source: CardSource;
  source_tier: SourceTier;
  source_status: SourceStatus;
}

export interface SelectedCard extends Card {
  reassigned: boolean;
  reassigned_reason?: string;
  urgency_bumped_reason?: string;
  unsure_note: boolean;
  order: number;
}

export const URGENCY_ORDER: Urgency[] = ["this_week", "this_month", "when_you_can"];
export const ROOM_ORDER: Room[] = [
  "bathroom",
  "stairs_entrance",
  "bedroom",
  "living",
  "kitchen",
  "whole_home",
  "routine",
];
export const SAFETY_FIELDS: ProfileField[] = ["foot_numbness", "vision_reduced"];
