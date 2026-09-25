"use client";

import { useState } from "react";
import { BookOpen, ChevronDown, ChevronUp, ExternalLink, EyeOff, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui";
import { responsibleFor } from "@/lib/responsibility";
import type { Caregiver, SelectedCard } from "@/lib/types";
import type { TailoredCard } from "@/lib/validate";

export const URGENCY_LABEL = { this_week: "This week", this_month: "This month", when_you_can: "When you can" } as const;
export const COST_LABEL = { free: "Free", low: "Low cost", medium: "Some cost", high: "Higher cost" } as const;
export const TIER_LABEL = {
  guideline: "Clinical guideline",
  health_service: "Health service",
  patient_org: "Patient organisation",
  product_logic: "Our reasoning, advice cited",
} as const;

export function ownerLabel(card: SelectedCard, caregiver: Caregiver): { text: string; tone: "teal" | "amber" | "stone" } {
  if (card.owner === "patient") return { text: "They do this", tone: "stone" };
  if (caregiver === "none") return { text: "Needs a helper", tone: "amber" };
  if (responsibleFor(card, caregiver) === "helper") return { text: "Helper does this", tone: "teal" };
  return { text: caregiver === "live_in_helper" ? "Family does this" : "You do this", tone: "teal" };
}

export function PlanCard({ card, caregiver, hidden, onReveal }: { card: TailoredCard; caregiver: Caregiver; hidden?: boolean; onReveal?: () => void }) {
  const [showSource, setShowSource] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const owner = ownerLabel(card, caregiver);

  if (hidden) {
    return (
      <li className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-4 print:hidden">
        <div className="flex items-start gap-2 text-sm text-stone-600">
          <EyeOff size={16} className="mt-0.5 shrink-0" />
          <div className="flex-1">
            <span className="font-medium text-stone-700">Probably not needed for you:</span> {card.original_action}
            {card.hide_reason && <span className="block text-stone-500">{card.hide_reason}</span>}
          </div>
        </div>
        <button type="button" onClick={onReveal} className="mt-1 min-h-12 text-sm font-medium text-teal-800 underline">
          Show anyway
        </button>
      </li>
    );
  }

  const action = showOriginal ? card.original_action : card.action;
  const why = showOriginal ? card.original_why : card.why;

  return (
    <li className="print-break-inside-avoid rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={card.urgency === "this_week" ? "teal" : "neutral"}>{URGENCY_LABEL[card.urgency]}</Badge>
        <Badge tone={owner.tone}>{owner.text}</Badge>
        <Badge>{COST_LABEL[card.cost]}</Badge>
        {card.tailored && !showOriginal && (
          <Badge tone="teal">
            <span className="inline-flex items-center gap-1"><Sparkles size={12} /> For your home</span>
          </Badge>
        )}
      </div>
      <h3 className="mt-2 text-base font-semibold leading-snug">{action}</h3>
      <p className="mt-1 text-sm text-stone-600">{why}</p>

      {!showOriginal && card.steps.length > 0 && (
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-stone-700">
          {card.steps.map((s) => <li key={s}>{s}</li>)}
        </ol>
      )}
      {!showOriginal && card.owner_note && (
        <p className="mt-2 text-sm text-teal-900"><span className="font-medium">Who and when:</span> {card.owner_note}</p>
      )}
      {card.urgency_raised_reason && <p className="mt-2 text-sm text-stone-600">Moved up: {card.urgency_raised_reason}.</p>}
      {card.tailored && (
        <button type="button" onClick={() => setShowOriginal((s) => !s)} className="mt-1 min-h-12 text-sm text-stone-500 underline print:hidden">
          {showOriginal ? "Show tailored version" : "Show original card"}
        </button>
      )}

      {card.reassigned && card.reassigned_reason && (
        <p className="mt-2 text-sm text-teal-900">
          <span className="font-medium">Moved to you:</span> {card.reassigned_reason}.
        </p>
      )}
      {card.owner === "caregiver" && caregiver === "none" && (
        <p className="mt-2 text-sm text-amber-900">Ask a family member, neighbour or community nurse to help with this.</p>
      )}
      {card.urgency_bumped_reason && <p className="mt-2 text-sm text-stone-600">{card.urgency_bumped_reason}.</p>}
      {card.unsure_note && <p className="mt-2 text-xs text-stone-500">Precaution</p>}

      <div className="mt-3 border-t border-stone-100 pt-2">
        <button
          type="button"
          onClick={() => setShowSource((s) => !s)}
          className="flex min-h-12 w-full items-center gap-1.5 text-sm text-stone-600 hover:text-stone-900 print:hidden"
          aria-expanded={showSource}
        >
          <BookOpen size={16} /> Source
          {card.source_status === "needs_source" && <Badge tone="amber">Source pending review</Badge>}
          {showSource ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        <div className={`${showSource ? "block" : "hidden"} print:block text-sm text-stone-700`}>
          <div className="font-medium">{card.source.title}</div>
          {card.source.section && <div className="text-stone-600">{card.source.section}</div>}
          {card.source.quote && <blockquote className="mt-1 border-l-2 border-stone-300 pl-2 italic text-stone-600">&ldquo;{card.source.quote}&rdquo;</blockquote>}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge>{TIER_LABEL[card.source_tier]}</Badge>
            {card.source_status === "needs_source" && <Badge tone="amber">Source pending review</Badge>}
            {card.source.url && (
              <a href={card.source.url} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center gap-1 px-1 text-teal-800 underline print:no-underline">
                Open source <ExternalLink size={14} />
              </a>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
