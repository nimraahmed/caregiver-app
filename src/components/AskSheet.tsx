"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { REFUSAL_TEXT } from "@/lib/guard";
import { EMERGENCY_NUMBER } from "@/lib/redflags";
import type { HouseholdContext, Profile } from "@/lib/types";
import type { TailoredCard } from "@/lib/validate";

type Msg = { role: "user" | "assistant"; content: string };

const MAX_TURNS = 6;
const MAX_CHARS = 300;

export function suggestedQuestions(ctx: HouseholdContext | null, cards: TailoredCard[]): string[] {
  const out: string[] = [];
  const routine = ctx?.routine[0];
  const person = ctx?.people[0];
  if (routine) out.push(`How do we fit this around "${routine}"?`);
  if (person) out.push(`What should ${person.split(" ")[0]} do first?`);
  if (cards.some((c) => c.room === "bathroom")) out.push("They refuse to sit down in the shower — what now?");
  out.push("Which of these should we do this weekend?");
  return out.slice(0, 3);
}

export function AskSheet({ open, onClose, profile, cards }: { open: boolean; onClose: () => void; profile: Profile; cards: TailoredCard[] }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  if (!open) return null;

  const userTurns = messages.filter((m) => m.role === "user").length;
  const atLimit = userTurns >= MAX_TURNS;

  const send = async (text: string) => {
    const q = text.trim().slice(0, MAX_CHARS);
    if (!q || busy || atLimit) return;
    const next: Msg[] = [...messages, { role: "user", content: q }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          profile,
          card_ids: cards.map((c) => c.id),
          steps: Object.fromEntries(cards.filter((c) => c.steps.length).map((c) => [c.id, c.steps])),
          messages: next,
        }),
      });
      if (!r.body) throw new Error("no body");
      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages([...next, { role: "assistant", content: acc }]);
      }
      if (!acc.trim()) setMessages([...next, { role: "assistant", content: "Sorry, I couldn't answer that. The plan above still applies." }]);
    } catch {
      setMessages([...next, { role: "assistant", content: "The assistant is unavailable right now. The plan above still applies." }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 print:hidden" role="dialog" aria-modal="true" aria-label="Ask about your plan">
      <div className="flex max-h-[88dvh] w-full max-w-md flex-col rounded-t-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-stone-200 px-4 py-2">
          <h2 className="flex items-center gap-2 text-base font-semibold"><MessageCircle size={18} /> Ask about your plan</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-12 w-12 items-center justify-center rounded-full text-stone-600 hover:bg-stone-100">
            <X size={20} />
          </button>
        </div>

        <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {messages.length === 0 && (
            <div>
              <p className="text-sm text-stone-600">I can explain any item in your plan or help you fit it into your routine. I can&rsquo;t answer medical questions.</p>
              <div className="mt-3 flex flex-col gap-2">
                {suggestedQuestions(profile.context, cards).map((q) => (
                  <button key={q} type="button" onClick={() => send(q)} className="min-h-12 rounded-xl border border-stone-300 px-4 py-2 text-left text-sm text-stone-800 hover:border-teal-700">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => {
            const refusal = m.role === "assistant" && m.content.trim() === REFUSAL_TEXT;
            return (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
                    m.role === "user" ? "bg-teal-700 text-white" : refusal ? "border border-amber-300 bg-amber-50 text-amber-950" : "bg-stone-100 text-stone-900"
                  }`}
                >
                  {m.content || <span className="text-stone-400">…</span>}
                </div>
              </div>
            );
          })}
        </div>

        <form
          className="border-t border-stone-200 px-4 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          {atLimit ? (
            <p className="text-sm text-stone-600">That&rsquo;s {MAX_TURNS} questions for this plan. Edit your answers to start a fresh plan.</p>
          ) : (
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                maxLength={MAX_CHARS}
                rows={1}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder="e.g. He showers at night — what changes?"
                className="min-h-12 flex-1 resize-none rounded-xl border border-stone-300 px-4 py-3 text-base focus:border-teal-700 focus:outline-none"
              />
              <button type="submit" disabled={busy || !input.trim()} aria-label="Send" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-white disabled:bg-stone-300">
                <Send size={18} />
              </button>
            </div>
          )}
          <p className="mt-2 text-xs text-stone-500">
            {userTurns}/{MAX_TURNS} questions · Not medical advice. For health questions ask their doctor or nurse; in an emergency call {EMERGENCY_NUMBER}.
          </p>
        </form>
      </div>
    </div>
  );
}
