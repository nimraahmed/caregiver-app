"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardCheck, FileText, ListChecks, RotateCcw } from "lucide-react";
import { Badge, Shell } from "@/components/ui";
import { URGENCY_LABEL, ownerLabel } from "@/components/PlanCard";
import { CARDS } from "@/lib/cards";
import { CHECKIN_DAY, FALLS_LABEL, daysSince, summarizeCheckIn } from "@/lib/checkin";
import { EMERGENCY_NUMBER } from "@/lib/redflags";
import { selectCards } from "@/lib/rules";
import { useAppState } from "@/lib/store";
import { URGENCY_ORDER } from "@/lib/types";

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function DashboardPage() {
  const { state, hydrated, reset } = useAppState();
  const router = useRouter();
  const p = state.profile;

  if (!hydrated) return <Shell><div className="h-40" /></Shell>;

  if (p.conditions.length === 0) {
    return (
      <Shell>
        <p className="text-stone-600">There is no plan on this device yet.</p>
        <Link href="/intake" className="mt-4 inline-block text-teal-800 underline">Start the questions</Link>
      </Shell>
    );
  }

  const cards = selectCards(p, CARDS);
  const ci = state.checkin;
  const summary = summarizeCheckIn(cards, ci);
  const day = daysSince(state.planCreatedAt);
  const daysLeft = day === null ? null : Math.max(0, CHECKIN_DAY - day);
  const who = state.patientName.trim() || "your family member";
  const pct = summary.total ? Math.round((summary.done / summary.total) * 100) : 0;
  const nextUp = URGENCY_ORDER.flatMap((u) => summary.outstanding.filter((c) => c.urgency === u)).slice(0, 3);

  return (
    <Shell>
      <header>
        <p className="text-sm font-medium uppercase tracking-wide text-teal-700">Caring for {who}</p>
        <h1 className="mt-1 text-2xl font-semibold">
          {summary.done} of {summary.total} plan items in place
        </h1>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-stone-200" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-teal-700" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-3 flex flex-wrap gap-2">
          {day !== null && <Badge tone="teal">Day {day} of {CHECKIN_DAY}</Badge>}
          {summary.week_pct !== null && <Badge tone={summary.week_pct === 100 ? "teal" : "amber"}>{summary.week_pct}% of “This week” done</Badge>}
          {ci.falls !== null && <Badge tone={ci.falls === "0" ? "neutral" : "amber"}>Falls: {FALLS_LABEL[ci.falls]}</Badge>}
        </p>
        {ci.saved_at && <p className="mt-2 text-xs text-stone-500">Last check-in saved {formatDate(ci.saved_at)}. Saved on this device only.</p>}
      </header>

      {(ci.falls === "1" || ci.falls === "2+") && (
        <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          You reported a fall. Mention it to their doctor or nurse, even without an injury. If someone is hurt or cannot get up, call {EMERGENCY_NUMBER}.
        </p>
      )}

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Next up</h2>
        {nextUp.length === 0 ? (
          <p className="mt-2 text-sm text-stone-600">Everything in the plan is in place. Keep the daily routine going and check in again in {daysLeft ?? CHECKIN_DAY} days.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {nextUp.map((c) => {
              const owner = ownerLabel(c, p.caregiver, state.patientName);
              return (
                <li key={c.id} className="rounded-xl border border-stone-200 bg-white p-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={c.urgency === "this_week" ? "teal" : "neutral"}>{URGENCY_LABEL[c.urgency]}</Badge>
                    <Badge tone={owner.tone}>{owner.text}</Badge>
                  </div>
                  <p className="mt-2 text-sm font-medium">{c.action}</p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Progress by urgency</h2>
        <ul className="mt-2 divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
          {URGENCY_ORDER.map((u) => {
            const g = summary.by_urgency[u];
            if (g.total === 0) return null;
            return (
              <li key={u} className="flex items-center justify-between px-4 py-3 text-sm">
                <span>{URGENCY_LABEL[u]}</span>
                <span className="font-medium">{g.done} / {g.total}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <nav className="mt-8 grid gap-3" aria-label="Plan actions">
        <Link href="/plan" className="flex min-h-12 items-center gap-3 rounded-xl border border-stone-300 bg-white px-4 text-sm font-medium text-stone-800 hover:bg-stone-50">
          <ListChecks size={18} className="text-teal-700" /> Open the full plan
        </Link>
        <Link href="/checkin" className="flex min-h-12 items-center gap-3 rounded-xl border border-stone-300 bg-white px-4 text-sm font-medium text-stone-800 hover:bg-stone-50">
          <ClipboardCheck size={18} className="text-teal-700" /> Update the check-in
        </Link>
        <Link href="/summary" className="flex min-h-12 items-center gap-3 rounded-xl border border-stone-300 bg-white px-4 text-sm font-medium text-stone-800 hover:bg-stone-50">
          <FileText size={18} className="text-teal-700" /> Summary for the care team
        </Link>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Start over? This removes the plan and check-in from this device.")) {
              reset();
              router.push("/intake");
            }
          }}
          className="flex min-h-12 items-center gap-3 rounded-xl px-4 text-sm text-stone-500 hover:text-stone-700"
        >
          <RotateCcw size={18} /> Start over for someone else
        </button>
      </nav>
    </Shell>
  );
}
