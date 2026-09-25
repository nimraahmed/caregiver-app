"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, Phone, Printer, Share2 } from "lucide-react";
import { Badge, Button, Shell } from "@/components/ui";
import { PlanCard, URGENCY_LABEL } from "@/components/PlanCard";
import { CARDS } from "@/lib/cards";
import { FOOT_WOUND_FLAG, EMERGENCY_NUMBER, STROKE_FLAG, redFlags } from "@/lib/redflags";
import { selectCards, softNotice, splitPlan } from "@/lib/rules";
import { buildShareText, whatsappUrl } from "@/lib/share";
import { useAppState } from "@/lib/store";
import { ROOM_ORDER, URGENCY_ORDER, type Room, type SelectedCard } from "@/lib/types";

const ROOM_LABEL: Record<Room, string> = {
  bathroom: "Bathroom",
  stairs_entrance: "Stairs and entrance",
  bedroom: "Bedroom",
  living: "Living areas and hallway",
  kitchen: "Kitchen",
  whole_home: "Whole home",
  routine: "Routine",
};

function groupBy<K extends string>(items: SelectedCard[], key: (c: SelectedCard) => K, order: readonly K[]): [K, SelectedCard[]][] {
  const map = new Map<K, SelectedCard[]>();
  for (const c of items) map.set(key(c), [...(map.get(key(c)) ?? []), c]);
  return order.filter((k) => map.has(k)).map((k) => [k, map.get(k)!]);
}

export default function PlanPage() {
  const { state, hydrated, update, setProfile } = useAppState();
  const [tab, setTab] = useState<"home" | "routine">("home");
  const p = state.profile;

  const selected = useMemo(() => (p.conditions.length ? selectCards(p, CARDS) : []), [p]);
  const { homeChanges, routine } = splitPlan(selected);
  const flags = redFlags(p);
  const notice = softNotice(p);

  if (!hydrated) return <Shell><div className="h-40" /></Shell>;

  if (p.conditions.length === 0) {
    return (
      <Shell>
        <p className="text-stone-600">We need a few answers first.</p>
        <Link href="/intake" className="mt-4 inline-block text-teal-800 underline">Start the questions</Link>
      </Shell>
    );
  }

  if (flags.stroke && !state.strokeFlagAcknowledged) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center bg-red-600 px-6 py-10 text-white">
        <AlertTriangle size={56} />
        <h1 className="mt-6 text-3xl font-bold leading-tight">{STROKE_FLAG.title}</h1>
        <p className="mt-3 text-2xl font-semibold">{STROKE_FLAG.body}</p>
        <p className="mt-4 text-red-100">Face drooping, arm weakness or slurred speech that started recently needs emergency care straight away.</p>
        <a
          href={`tel:${EMERGENCY_NUMBER}`}
          className="mt-8 flex min-h-16 items-center justify-center gap-3 rounded-2xl bg-white text-2xl font-bold text-red-700"
        >
          <Phone size={28} /> Call {EMERGENCY_NUMBER}
        </a>
        <button
          type="button"
          onClick={() => update((s) => ({ ...s, strokeFlagAcknowledged: true }))}
          className="mt-6 min-h-12 rounded-xl border border-white/60 px-4 text-base text-white"
        >
          {STROKE_FLAG.ack} — show the plan
        </button>
        <button
          type="button"
          onClick={() => setProfile({ new_stroke_signs: false })}
          className="mt-4 min-h-12 text-center text-sm text-red-100 underline"
        >
          I ticked this by mistake
        </button>
      </div>
    );
  }

  const weekCount = selected.filter((c) => c.urgency === "this_week").length;
  const monthCount = selected.filter((c) => c.urgency === "this_month").length;
  const shareText = buildShareText(selected);

  return (
    <Shell
      footer={
        <>
          <a href={whatsappUrl(shareText)} target="_blank" rel="noreferrer" className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 font-medium text-white hover:bg-teal-800">
            <Share2 size={18} /> Share
          </a>
          <Button variant="secondary" onClick={() => window.print()} className="flex-1">
            <span className="flex items-center justify-center gap-2"><Printer size={18} /> Print</span>
          </Button>
        </>
      }
    >
      <header>
        <p className="text-sm font-medium uppercase tracking-wide text-teal-700">Your plan</p>
        <h1 className="mt-1 text-2xl font-semibold">
          {weekCount} {weekCount === 1 ? "change" : "changes"} this week, {monthCount} for this month
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          Based on your answers. Every item shows its source.{" "}
          <Link href="/confirm" className="inline-flex min-h-12 items-center px-1 text-teal-800 underline print:hidden">Edit answers</Link>
        </p>
      </header>

      {flags.footWound && (
        <div className="mt-5 flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
          <AlertTriangle className="mt-0.5 shrink-0" size={20} />
          <p className="text-sm font-medium">{FOOT_WOUND_FLAG.body}</p>
        </div>
      )}
      {notice && <div className="mt-4 rounded-xl border border-stone-200 bg-stone-100 p-4 text-sm text-stone-700">{notice}</div>}

      <div role="tablist" className="mt-6 grid grid-cols-2 rounded-xl bg-stone-200 p-1 print:hidden">
        {(["home", "routine"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`min-h-12 rounded-lg text-sm font-medium ${tab === t ? "bg-white text-stone-900 shadow-sm" : "text-stone-600"}`}
          >
            {t === "home" ? `Home changes (${homeChanges.length})` : `Daily routine (${routine.length})`}
          </button>
        ))}
      </div>

      <section className={`${tab === "home" ? "block" : "hidden"} print:block mt-4`}>
        <h2 className="hidden text-xl font-semibold print:block">Home changes</h2>
        {homeChanges.length === 0 && <p className="text-stone-600">No home changes from your answers.</p>}
        {groupBy(homeChanges, (c) => c.room, ROOM_ORDER).map(([room, cards]) => (
          <div key={room} className="mt-5">
            <h3 className="mb-2 text-lg font-semibold">{ROOM_LABEL[room]}</h3>
            <ul className="space-y-3">
              {cards.map((c) => <PlanCard key={c.id} card={c} caregiver={p.caregiver} />)}
            </ul>
          </div>
        ))}
      </section>

      <section className={`${tab === "routine" ? "block" : "hidden"} print:block mt-4 print:mt-8`}>
        <h2 className="hidden text-xl font-semibold print:block">Daily routine</h2>
        {routine.length === 0 && <p className="text-stone-600">No daily-routine items from your answers.</p>}
        {groupBy(routine, (c) => c.owner, ["caregiver", "patient"] as const).map(([owner, cards]) => (
          <div key={owner} className="mt-5">
            <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold">
              {owner === "caregiver" ? (p.caregiver === "none" ? "Needs a helper" : "For you") : "For your family member"}
            </h3>
            <ul className="space-y-3">
              {cards.map((c) => <PlanCard key={c.id} card={c} caregiver={p.caregiver} />)}
            </ul>
          </div>
        ))}
      </section>

      <footer className="mt-10 text-xs text-stone-500">
        <p className="flex flex-wrap gap-2">
          {URGENCY_ORDER.map((u) => <Badge key={u}>{URGENCY_LABEL[u]}: {selected.filter((c) => c.urgency === u).length}</Badge>)}
        </p>
        <p className="mt-3">
          This plan covers the home and daily routine only. It is not medical advice. For health questions, ask their doctor or nurse; in an emergency call {EMERGENCY_NUMBER}.
        </p>
      </footer>
    </Shell>
  );
}
