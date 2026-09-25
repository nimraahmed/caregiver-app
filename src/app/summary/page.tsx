"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Copy, Printer } from "lucide-react";
import { Button, Shell } from "@/components/ui";
import { CARDS } from "@/lib/cards";
import { EMERGENCY_NUMBER } from "@/lib/redflags";
import { selectCards } from "@/lib/rules";
import { useAppState } from "@/lib/store";
import { buildSummaryText, checkInLines, flagLines, profileFacts, summaryRows } from "@/lib/summary";

export default function SummaryPage() {
  const { state, hydrated } = useAppState();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const p = state.profile;

  if (!hydrated) return <Shell><div className="h-40" /></Shell>;

  if (p.conditions.length === 0) {
    return (
      <Shell>
        <p className="text-stone-600">There is no plan to summarise yet.</p>
        <Link href="/intake" className="mt-4 inline-block text-teal-800 underline">Start the questions</Link>
      </Shell>
    );
  }

  const cards = selectCards(p, CARDS);
  const facts = profileFacts(p);
  const flags = flagLines(p);
  const checkin = checkInLines(cards, state.checkin);
  const rows = summaryRows(cards, p, state.checkin);
  const text = buildSummaryText(p, cards, state.checkin, state.planCreatedAt);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Shell
      footer={
        <>
          <Button variant="secondary" onClick={() => router.push("/plan")} className="flex-1">
            <span className="flex items-center justify-center gap-2"><ArrowLeft size={18} /> Plan</span>
          </Button>
          <Button variant="secondary" onClick={copy} className="flex-1">
            <span className="flex items-center justify-center gap-2"><Copy size={18} /> {copied ? "Copied" : "Copy text"}</span>
          </Button>
          <Button onClick={() => window.print()} className="flex-1">
            <span className="flex items-center justify-center gap-2"><Printer size={18} /> Print</span>
          </Button>
        </>
      }
    >
      <header>
        <p className="text-sm font-medium uppercase tracking-wide text-teal-700">For the care team</p>
        <h1 className="mt-1 text-2xl font-semibold">Home adaptation plan — summary</h1>
        <p className="mt-2 text-sm text-stone-600">
          {state.planCreatedAt ? `Plan created ${new Date(state.planCreatedAt).toLocaleDateString("en-GB")}. ` : ""}
          Caregiver-reported answers and the plan items they were given, with sources. Hand this to the discharge nurse, OT or GP.
        </p>
      </header>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Household (caregiver-reported)</h2>
        <dl className="mt-2 grid grid-cols-[minmax(0,10rem)_1fr] gap-x-3 gap-y-1 text-sm">
          {facts.map((f) => (
            <div key={f.label} className="contents">
              <dt className="text-stone-500">{f.label}</dt>
              <dd className="text-stone-900">{f.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {flags.length > 0 && (
        <section className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <h2 className="font-semibold">Flags raised at intake</h2>
          <ul className="mt-1 list-disc pl-5">{flags.map((l) => <li key={l}>{l}</li>)}</ul>
        </section>
      )}

      {checkin.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold">30-day check-in</h2>
          <ul className="mt-1 list-disc pl-5 text-sm text-stone-800">{checkin.map((l) => <li key={l}>{l}</li>)}</ul>
        </section>
      )}

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Plan items ({rows.length})</h2>
        <ol className="mt-2 space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="print-break-inside-avoid rounded-xl border border-stone-200 bg-white p-3 text-sm">
              <div className="flex items-start gap-2">
                {r.done !== null && (
                  <span aria-label={r.done ? "Done" : "Not done"} className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs ${r.done ? "border-teal-700 bg-teal-700 text-white" : "border-stone-400"}`}>
                    {r.done ? "✓" : ""}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="font-medium text-stone-900">{r.action}</p>
                  <p className="mt-1 text-xs text-stone-600">
                    {r.urgency} · {r.responsible} · <span className="font-mono">{r.id}</span>
                  </p>
                  <p className="mt-1 text-xs text-stone-500">Source: {r.source}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <footer className="mt-8 text-xs text-stone-500">
        Generated from the caregiver&apos;s answers. Items come from public guidance (IWGDF 2023, NICE NG236, NHS, Stroke Association and others) selected by fixed rules;
        nothing here is a clinical assessment or medical advice. In an emergency call {EMERGENCY_NUMBER}.
      </footer>
    </Shell>
  );
}
