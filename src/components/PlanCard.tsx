"use client";

import { useState } from "react";
import { BookOpen, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui";
import type { Caregiver, SelectedCard } from "@/lib/types";

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
  return { text: "You do this", tone: "teal" };
}

export function PlanCard({ card, caregiver }: { card: SelectedCard; caregiver: Caregiver }) {
  const [showSource, setShowSource] = useState(false);
  const owner = ownerLabel(card, caregiver);

  return (
    <li className="print-break-inside-avoid rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={card.urgency === "this_week" ? "teal" : "neutral"}>{URGENCY_LABEL[card.urgency]}</Badge>
        <Badge tone={owner.tone}>{owner.text}</Badge>
        <Badge>{COST_LABEL[card.cost]}</Badge>
      </div>
      <h3 className="mt-2 text-base font-semibold leading-snug">{card.action}</h3>
      <p className="mt-1 text-sm text-stone-600">{card.why}</p>

      {card.reassigned && card.reassigned_reason && (
        <p className="mt-2 text-sm text-teal-900">
          <span className="font-medium">Moved to you:</span> {card.reassigned_reason}.
        </p>
      )}
      {card.owner === "caregiver" && caregiver === "none" && (
        <p className="mt-2 text-sm text-amber-900">Ask a family member, neighbour or community nurse to help with this.</p>
      )}
      {card.urgency_bumped_reason && <p className="mt-2 text-sm text-stone-600">{card.urgency_bumped_reason}.</p>}
      {card.unsure_note && <p className="mt-2 text-sm text-stone-500">Shown because you weren&rsquo;t sure — safer to include it.</p>}

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
