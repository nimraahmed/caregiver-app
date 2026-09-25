"use client";

import { Choice } from "@/components/ui";
import { DAILY_FIELDS, DAILY_LABELS, FREE_TEXT_EXAMPLES, LABELS, type QuestionId } from "@/lib/questions";
import type { ConditionId, Profile, Tri } from "@/lib/types";

interface Props {
  id: QuestionId;
  profile: Profile;
  evidence: Record<string, string>;
  answered: string[];
  patientName: string;
  onNameChange: (name: string) => void;
  onChange: (patch: Partial<Profile>) => void;
}

/** Tri-state questions where null means "Not sure" — it must be chosen, not skipped. */
const TRI_QUESTIONS = ["foot_numbness", "vision_reduced"] as const;

export function isAnswered(id: QuestionId, p: Profile, answered: string[]): boolean {
  if (id === "conditions") return p.conditions.length > 0;
  if (id === TRI_QUESTIONS[0] || id === TRI_QUESTIONS[1]) return p[id] !== null || answered.includes(id);
  return true;
}

function Evidence({ quote }: { quote?: string }) {
  if (!quote) return null;
  return <p className="mt-3 text-sm text-teal-800">From your description: &ldquo;{quote}&rdquo;</p>;
}

function TriChoice({ value, chosen, onChange }: { value: Tri; chosen: boolean; onChange: (v: Tri) => void }) {
  const opts: Tri[] = [true, false, null];
  return (
    <div className="space-y-3">
      {opts.map((o) => (
        <Choice key={String(o)} label={LABELS.tri[String(o) as "true" | "false" | "null"]} selected={value === o && (o !== null || chosen)} onClick={() => onChange(o)} />
      ))}
    </div>
  );
}

function Group<T extends string>({
  options,
  value,
  onChange,
  labels,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
  labels: Record<T, string>;
}) {
  return (
    <div className="space-y-3">
      {options.map((o) => (
        <Choice key={o} label={labels[o]} selected={value === o} onClick={() => onChange(o)} />
      ))}
    </div>
  );
}

export function QuestionBody({ id, profile: p, evidence, answered, patientName, onNameChange, onChange }: Props) {
  switch (id) {
    case "conditions": {
      const toggle = (c: ConditionId) => {
        const has = p.conditions.includes(c);
        const conditions = has ? p.conditions.filter((x) => x !== c) : [...p.conditions, c];
        const patch: Partial<Profile> = { conditions };
        if (!conditions.includes("t2dm")) Object.assign(patch, { foot_numbness: null, vision_reduced: null, open_foot_wound: false });
        if (conditions.includes("stroke") && p.weak_side === "none") patch.weak_side = "unknown";
        if (!conditions.includes("stroke")) Object.assign(patch, { weak_side: "none", grip_difficulty: false, memory_or_attention_issues: false, swallowing_issues: false });
        onChange(patch);
      };
      return (
        <div className="space-y-3">
          {(["t2dm", "stroke"] as ConditionId[]).map((c) => (
            <Choice key={c} multi label={LABELS.conditions[c]} selected={p.conditions.includes(c)} onClick={() => toggle(c)} />
          ))}
          <Evidence quote={evidence.conditions} />
          <label className="mt-6 block">
            <span className="mb-2 block text-sm font-medium text-stone-600">What do you call them? (optional)</span>
            <input
              type="text"
              value={patientName}
              maxLength={30}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="e.g. Mum, Baba, Ahmed"
              className="w-full rounded-xl border border-stone-300 bg-white p-4 text-base focus:border-teal-700 focus:outline-none"
            />
            <span className="mt-1 block text-xs text-stone-500">Used only to label the plan on this device.</span>
          </label>
        </div>
      );
    }
    case "free_text":
      return (
        <div>
          <textarea
            value={p.free_text}
            maxLength={500}
            rows={6}
            onChange={(e) => onChange({ free_text: e.target.value })}
            placeholder="For example: My father is 64, had a stroke last week and his feet are numb from the diabetes. He sleeps upstairs and showers at night. Our helper leaves at 6pm."
            className="w-full rounded-xl border border-stone-300 bg-white p-4 text-base focus:border-teal-700 focus:outline-none"
          />
          <div className="mt-1 text-right text-xs text-stone-500">{p.free_text.length}/500</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {FREE_TEXT_EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => onChange({ free_text: ((p.free_text ? p.free_text.trimEnd() + " " : "") + ex).slice(0, 500) })}
                disabled={p.free_text.length + ex.length + 1 > 500}
                className="min-h-12 rounded-full border border-stone-300 bg-white px-4 py-2 text-left text-sm text-stone-700 hover:border-teal-700 disabled:opacity-40"
              >
                + {ex}
              </button>
            ))}
          </div>
        </div>
      );
    case "foot_numbness":
      return (
        <>
          <TriChoice value={p.foot_numbness} chosen={answered.includes(id)} onChange={(v) => onChange({ foot_numbness: v })} />
          <Evidence quote={evidence.foot_numbness} />
        </>
      );
    case "vision_reduced":
      return (
        <>
          <TriChoice value={p.vision_reduced} chosen={answered.includes(id)} onChange={(v) => onChange({ vision_reduced: v })} />
          <Evidence quote={evidence.vision_reduced} />
        </>
      );
    case "weak_side":
      return (
        <>
          <Group options={["left", "right", "both", "unknown"]} value={p.weak_side === "none" ? "unknown" : p.weak_side} onChange={(v) => onChange({ weak_side: v })} labels={LABELS.weak_side} />
          <Evidence quote={evidence.weak_side} />
        </>
      );
    case "walks":
      return (
        <>
          <Group options={["independently", "with_aid", "with_help", "not_walking"]} value={p.walks} onChange={(v) => onChange({ walks: v })} labels={LABELS.walks} />
          <Evidence quote={evidence.walks} />
        </>
      );
    case "stroke_issues": {
      const none = !p.grip_difficulty && !p.memory_or_attention_issues && !p.swallowing_issues;
      return (
        <div className="space-y-3">
          <Choice multi label="Hard to grip or hold things" selected={p.grip_difficulty} onClick={() => onChange({ grip_difficulty: !p.grip_difficulty })} />
          <Choice multi label="Memory or attention problems" selected={p.memory_or_attention_issues} onClick={() => onChange({ memory_or_attention_issues: !p.memory_or_attention_issues })} />
          <Choice multi label="Trouble swallowing" selected={p.swallowing_issues} onClick={() => onChange({ swallowing_issues: !p.swallowing_issues })} />
          <Choice label="None of these" selected={none} onClick={() => onChange({ grip_difficulty: false, memory_or_attention_issues: false, swallowing_issues: false })} />
        </div>
      );
    }
    case "home":
      return (
        <div className="space-y-6">
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-stone-600">Type of home</legend>
            <Group options={["apartment", "villa"]} value={p.home_type} onChange={(v) => onChange({ home_type: v })} labels={LABELS.home_type} />
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-stone-600">Do they use stairs every day?</legend>
            <div className="space-y-3">
              <Choice label="Yes" selected={p.stairs_used_daily} onClick={() => onChange({ stairs_used_daily: true })} />
              <Choice label="No" selected={!p.stairs_used_daily} onClick={() => onChange({ stairs_used_daily: false })} />
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-stone-600">Bathroom</legend>
            <Group options={["shower", "bathtub", "both"]} value={p.bathroom_type} onChange={(v) => onChange({ bathroom_type: v })} labels={LABELS.bathroom_type} />
          </fieldset>
        </div>
      );
    case "daily": {
      const none = DAILY_FIELDS.every((f) => !p[f]);
      return (
        <div className="space-y-3">
          {DAILY_FIELDS.map((f) => (
            <Choice key={f} multi label={DAILY_LABELS[f]} selected={p[f]} onClick={() => onChange({ [f]: !p[f] })} />
          ))}
          <Choice label="None of these" selected={none} onClick={() => onChange(Object.fromEntries(DAILY_FIELDS.map((f) => [f, false])))} />
        </div>
      );
    }
    case "help":
      return (
        <div className="space-y-6">
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-stone-600">Who helps them day to day?</legend>
            <Group options={["family", "live_in_helper", "both", "none"]} value={p.caregiver} onChange={(v) => onChange({ caregiver: v })} labels={LABELS.caregiver} />
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-stone-600">How long are they alone on a normal day?</legend>
            <Group options={["0", "1-4", "5+"]} value={p.alone_hours_per_day} onChange={(v) => onChange({ alone_hours_per_day: v })} labels={LABELS.alone_hours_per_day} />
          </fieldset>
        </div>
      );
    case "red_flags": {
      const none = !p.open_foot_wound && !p.new_stroke_signs;
      return (
        <div className="space-y-3">
          {p.conditions.includes("t2dm") && (
            <Choice multi label="An open sore, cut or blister on the foot" selected={p.open_foot_wound} onClick={() => onChange({ open_foot_wound: !p.open_foot_wound })} />
          )}
          <Choice
            multi
            label="New face drooping, arm weakness or slurred speech"
            sub="Started today or in the last few hours"
            selected={p.new_stroke_signs}
            onClick={() => onChange({ new_stroke_signs: !p.new_stroke_signs })}
          />
          <Choice label="None of these" selected={none} onClick={() => onChange({ open_foot_wound: false, new_stroke_signs: false })} />
          <Evidence quote={evidence.open_foot_wound ?? evidence.new_stroke_signs} />
        </div>
      );
    }
  }
}
