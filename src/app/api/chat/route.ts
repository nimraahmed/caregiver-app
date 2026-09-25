import { NextResponse } from "next/server";
import { CARDS } from "@/lib/cards";
import { acceptsRefusal, isMedicalQuestion, REFUSAL_TEXT, violatesGeneratedText } from "@/lib/guard";
import { completeText, llmConfig, type ChatMessage } from "@/lib/llm";
import { CHAT_SYSTEM } from "@/lib/prompts";
import { allowRequest, rateLimited } from "@/lib/ratelimit";
import { selectCards } from "@/lib/rules";
import { chatRequestSchema, contextIsEmpty, sanitizeContext } from "@/lib/validate";

export const maxDuration = 30;

const MAX_USER_TURNS = 6;
const UNAVAILABLE = "The assistant is unavailable right now. The plan above still applies.";
const UNGROUNDED = "I can only help with the home changes in your plan. Please ask their doctor or nurse about anything medical.";
const NOT_NEGOTIABLE =
  "The plan items stand as written — they are there to prevent a fall or injury, so I can't suggest a way around one. Try introducing it once with someone present, and ask their nurse or occupational therapist for help if it is still refused.";

function text(body: string, status = 200) {
  return new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}

export async function POST(req: Request) {
  if (!allowRequest(req, "chat", 20)) return rateLimited();
  const body = chatRequestSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "invalid request" }, { status: 400 });

  const { messages, profile, card_ids, steps } = body.data;
  const last = messages[messages.length - 1];
  if (last.role !== "user") return NextResponse.json({ error: "last message must be from user" }, { status: 400 });
  if (last.content.length > 300) return text("Please keep your question under 300 characters.");
  if (messages.filter((m) => m.role === "user").length > MAX_USER_TURNS) {
    return text("That's the limit for this plan. Edit your answers to start a fresh plan and ask again.");
  }

  // Deterministic guard runs before any model call.
  if (isMedicalQuestion(last.content)) return text(REFUSAL_TEXT);

  const cfg = llmConfig();
  if (!cfg) return text(UNAVAILABLE, 503);

  // Grounding is recomputed from the library; the client only says which selected cards are visible.
  const visible = new Set(card_ids);
  const cards = selectCards(profile, CARDS).filter((c) => visible.size === 0 || visible.has(c.id));
  const context = sanitizeContext(profile.context);
  const grounding = {
    context: contextIsEmpty(context) ? null : context,
    cards: cards.map((c) => ({
      action: c.action,
      why: c.why,
      steps: (steps[c.id] ?? []).filter((s) => !violatesGeneratedText(s)),
      owner: c.owner,
      urgency: c.urgency,
      room: c.room,
    })),
  };

  const llmMessages: ChatMessage[] = [
    { role: "system", content: CHAT_SYSTEM },
    { role: "system", content: `Household and plan:\n${JSON.stringify(grounding)}` },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  try {
    let answer = (await completeText(cfg, llmMessages, { temperature: 0.5, maxTokens: 400, signal: req.signal })).trim();
    if (!answer) return text(UNAVAILABLE, 503);
    // Models sometimes bolt the refusal onto an otherwise grounded answer; the guard already decided this was non-medical.
    if (answer !== REFUSAL_TEXT && answer.includes(REFUSAL_TEXT)) answer = answer.replace(REFUSAL_TEXT, "").trim();
    // The whole reply is checked before any of it is shown.
    if (violatesGeneratedText(answer)) return text(UNGROUNDED);
    if (acceptsRefusal(answer)) return text(NOT_NEGOTIABLE);
    return text(answer);
  } catch {
    return text(UNAVAILABLE, 503);
  }
}
