"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Shell } from "@/components/ui";
import { useAppState } from "@/lib/store";
import { LABELS, dailyTrue, type QuestionId } from "@/lib/questions";
import type { Profile } from "@/lib/types";
import { QUESTION_FOR } from "@/lib/parseClient";
import { ContextChips } from "@/components/ContextChips";

function evidenceFor(q: QuestionId, evidence: Record<string, string>): string | null {
  const quotes = Object.entries(QUESTION_FOR)
    .filter(([, question]) => question === q)
    .map(([field]) => evidence[field])
    .filter((x): x is string => Boolean(x));
  return quotes.length ? Array.from(new Set(quotes)).join(" … ") : null;
}

function rows(p: Profile): { q: QuestionId; label: string; value: string }[] {
  const t2dm = p.conditions.includes("t2dm");
  const stroke = p.conditions.includes("stroke");
  const tri = (v: boolean | null) => LABELS.tri[String(v) as "true" | "false" | "null"];
  const issues = [p.grip_difficulty && "Hard to grip", p.memory_or_attention_issues && "Memory or attention", p.swallowing_issues && "Swallowing"].filter(Boolean);
  const flags = [p.open_foot_wound && "Open foot sore", p.new_stroke_signs && "New stroke signs"].filter(Boolean);
  const out: { q: QuestionId; label: string; value: string }[] = [
    { q: "conditions", label: "Conditions", value: p.conditions.map((c) => LABELS.conditions[c]).join(", ") || "—" },
  ];
  if (t2dm) out.push({ q: "foot_numbness", label: "Numb feet", value: tri(p.foot_numbness) }, { q: "vision_reduced", label: "Eyesight worse", value: tri(p.vision_reduced) });
  if (stroke) out.push({ q: "weak_side", label: "Weak side", value: LABELS.weak_side[p.weak_side as keyof typeof LABELS.weak_side] ?? "—" });
  out.push({ q: "walks", label: "Gets around", value: LABELS.walks[p.walks] });
  if (stroke) out.push({ q: "stroke_issues", label: "Other difficulties", value: issues.length ? issues.join(", ") : "None" });
  out.push(
    { q: "home", label: "Home", value: `${LABELS.home_type[p.home_type]}, ${p.stairs_used_daily ? "stairs daily" : "no stairs"}, ${LABELS.bathroom_type[p.bathroom_type].toLowerCase()}` },
    { q: "daily", label: "Normal day", value: dailyTrue(p).join(", ") || "None of the listed" },
    { q: "help", label: "Help", value: `${LABELS.caregiver[p.caregiver]}; alone ${LABELS.alone_hours_per_day[p.alone_hours_per_day].toLowerCase()}` },
    { q: "red_flags", label: "Right now", value: flags.length ? flags.join(", ") : "Nothing urgent" },
  );
  return out;
}

export default function ConfirmPage() {
  const router = useRouter();
  const { state, hydrated, update } = useAppState();
  if (!hydrated) return <Shell><div className="h-40" /></Shell>;
  const p = state.profile;
  if (p.conditions.length === 0) {
    return (
      <Shell>
        <p className="text-stone-600">Let&rsquo;s start with a few questions.</p>
        <Link href="/intake" className="mt-4 inline-block text-teal-800 underline">Go to questions</Link>
      </Shell>
    );
  }

  return (
    <Shell
      footer={
        <>
          <Button variant="secondary" onClick={() => router.push("/intake?q=red_flags")} className="w-28">Back</Button>
          <Button onClick={() => router.push("/plan")} className="flex-1">See my plan</Button>
        </>
      }
    >
      <h1 className="text-2xl font-semibold">Does this look right?</h1>
      <p className="mt-2 text-stone-600">Tap Edit to change anything.</p>
      <ul className="mt-6 divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
        {rows(p).map((r) => (
          <li key={r.q} className="flex items-center justify-between gap-3 px-4 py-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-stone-500">{r.label}</div>
              <div className="text-base">{r.value}</div>
              {evidenceFor(r.q, state.evidence) && <div className="mt-0.5 text-xs text-teal-800">From your description: &ldquo;{evidenceFor(r.q, state.evidence)}&rdquo;</div>}
            </div>
            <Link href={`/intake?q=${r.q}&return=confirm`} className="inline-flex min-h-12 shrink-0 items-center rounded-lg px-3 text-sm font-medium text-teal-800 hover:bg-teal-50">
              Edit
            </Link>
          </li>
        ))}
      </ul>
      {p.free_text.trim() && (
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-wide text-stone-500">In your words</div>
            <Link href="/intake?q=free_text&return=confirm" className="inline-flex min-h-12 items-center rounded-lg px-3 text-sm font-medium text-teal-800 hover:bg-teal-50">
              Edit
            </Link>
          </div>
          <p className="mt-1 whitespace-pre-wrap rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700">{p.free_text}</p>
        </div>
      )}
      {p.context && (
        <div className="mt-6">
          <div className="text-xs uppercase tracking-wide text-stone-500">What we understood about your home</div>
          <p className="mb-2 mt-1 text-sm text-stone-600">The plan is tailored to these. Remove anything that&rsquo;s wrong.</p>
          <ContextChips
            context={p.context}
            onRemove={(key, text) =>
              update((s) => {
                const ctx = s.profile.context;
                if (!ctx) return s;
                return { ...s, plan: null, profile: { ...s.profile, context: { ...ctx, [key]: ctx[key].filter((t) => t !== text) } } };
              })
            }
          />
        </div>
      )}
    </Shell>
  );
}
