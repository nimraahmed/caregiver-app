"use client";

import { X } from "lucide-react";
import type { HouseholdContext } from "@/lib/types";

export const CONTEXT_LABEL: Record<keyof HouseholdContext, string> = {
  layout: "Home",
  routine: "Routine",
  people: "People",
  preferences: "Preferences",
  other: "Other",
};

const KEYS = Object.keys(CONTEXT_LABEL) as (keyof HouseholdContext)[];

export function contextEntries(ctx: HouseholdContext | null): { key: keyof HouseholdContext; text: string }[] {
  if (!ctx) return [];
  return KEYS.flatMap((key) => ctx[key].map((text) => ({ key, text })));
}

export function ContextChips({ context, onRemove }: { context: HouseholdContext | null; onRemove?: (key: keyof HouseholdContext, text: string) => void }) {
  const entries = contextEntries(context);
  if (entries.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {entries.map(({ key, text }) => (
        <li key={`${key}:${text}`} className="inline-flex min-h-10 items-center gap-1 rounded-full bg-teal-50 pl-3 text-sm text-teal-900 ring-1 ring-teal-200">
          <span className="text-xs uppercase tracking-wide text-teal-700">{CONTEXT_LABEL[key]}</span>
          <span className={onRemove ? "" : "pr-3"}>{text}</span>
          {onRemove && (
            <button type="button" aria-label={`Remove "${text}"`} onClick={() => onRemove(key, text)} className="flex h-12 w-12 items-center justify-center rounded-full text-teal-700 hover:bg-teal-100">
              <X size={16} />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
