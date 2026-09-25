"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { Badge, Button, Choice, Shell } from "@/components/ui";
import { URGENCY_LABEL } from "@/components/PlanCard";
import { CARDS } from "@/lib/cards";
import { CHECKIN_DAY, FALLS_LABEL, daysSince, summarizeCheckIn, type Falls } from "@/lib/checkin";
import { EMERGENCY_NUMBER } from "@/lib/redflags";
import { selectCards } from "@/lib/rules";
import { useAppState } from "@/lib/store";
import { URGENCY_ORDER } from "@/lib/types";

export default function CheckInPage() {
  const { state, hydrated, update } = useAppState();
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const p = state.profile;

  if (!hydrated) return <Shell><div className="h-40" /></Shell>;

  if (p.conditions.length === 0) {
    return (
      <Shell>
        <p className="text-stone-600">There is no plan to check in on yet.</p>
        <Link href="/intake" className="mt-4 inline-block text-teal-800 underline">Start the questions</Link>
      </Shell>
    );
  }

  const cards = selectCards(p, CARDS);
  const ci = state.checkin;
  const doneSet = new Set(ci.done);
  const summary = summarizeCheckIn(cards, ci);
  const day = daysSince(state.planCreatedAt);

  const toggle = (id: string) =>
    update((s) => ({
      ...s,
      checkin: { ...s.checkin, done: s.checkin.done.includes(id) ? s.checkin.done.filter((d) => d !== id) : [...s.checkin.done, id] },
    }));
  const setFalls = (falls: Falls) => update((s) => ({ ...s, checkin: { ...s.checkin, falls } }));
  const setNear = (near_falls: boolean) => update((s) => ({ ...s, checkin: { ...s.checkin, near_falls } }));
  const save = () => {
    update((s) => ({ ...s, checkin: { ...s.checkin, saved_at: new Date().toISOString() } }));
    setSaved(true);
  };

  return (
    <Shell
      footer={
        <>
          <Button variant="secondary" onClick={() => router.push("/plan")} className="flex-1">
            <span className="flex items-center justify-center gap-2"><ArrowLeft size={18} /> Plan</span>
          </Button>
          <Button onClick={save} className="flex-1">
            <span className="flex items-center justify-center gap-2"><Check size={18} /> {saved ? "Saved" : "Save check-in"}</span>
          </Button>
        </>
      }
    >
      <header>
        <p className="text-sm font-medium uppercase tracking-wide text-teal-700">{CHECKIN_DAY}-day check-in</p>
        <h1 className="mt-1 text-2xl font-semibold">What has been done so far?</h1>
        <p className="mt-2 text-sm text-stone-600">
          {day !== null ? `Day ${day} since your plan. ` : ""}
          Tick what is in place. This is for you and the care team — nothing is sent anywhere.
        </p>
        <p className="mt-3 flex flex-wrap gap-2">
          <Badge tone="teal">{summary.done} of {summary.total} done</Badge>
          {summary.week_pct !== null && <Badge tone={summary.week_pct === 100 ? "teal" : "amber"}>{summary.week_pct}% of “This week” items</Badge>}
        </p>
      </header>

      {URGENCY_ORDER.map((u) => {
        const group = cards.filter((c) => c.urgency === u);
        if (group.length === 0) return null;
        return (
          <section key={u} className="mt-6">
            <h2 className="mb-2 text-lg font-semibold">{URGENCY_LABEL[u]}</h2>
            <ul className="space-y-2">
              {group.map((c) => (
                <li key={c.id}>
                  <Choice multi label={c.action} selected={doneSet.has(c.id)} onClick={() => toggle(c.id)} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Any falls in the last {CHECKIN_DAY} days?</h2>
        <div className="mt-2 space-y-2">
          {(Object.keys(FALLS_LABEL) as Falls[]).map((f) => (
            <Choice key={f} label={FALLS_LABEL[f]} selected={ci.falls === f} onClick={() => setFalls(f)} />
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Any near-falls, trips or slips?</h2>
        <div className="mt-2 space-y-2">
          <Choice label="No" selected={ci.near_falls === false} onClick={() => setNear(false)} />
          <Choice label="Yes" selected={ci.near_falls === true} onClick={() => setNear(true)} />
        </div>
      </section>

      {(ci.falls === "1" || ci.falls === "2+") && (
        <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          A fall should be mentioned to their doctor or nurse, even without an injury. If someone is hurt or cannot get up, call {EMERGENCY_NUMBER}.
        </p>
      )}

      <footer className="mt-10 text-xs text-stone-500">
        Saved on this device only. Open <Link href="/summary" className="underline">Summary for the care team</Link> to include this check-in in the printout.
      </footer>
    </Shell>
  );
}
