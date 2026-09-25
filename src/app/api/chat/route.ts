import { NextResponse } from "next/server";
import { isMedicalQuestion, REFUSAL_TEXT } from "@/lib/guard";
import { llmConfig, streamText, type ChatMessage } from "@/lib/llm";
import { CHAT_SYSTEM } from "@/lib/prompts";
import { chatRequestSchema, contextIsEmpty, sanitizeContext } from "@/lib/validate";

export const maxDuration = 30;

const MAX_USER_TURNS = 6;

function text(body: string, status = 200) {
  return new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8" } });
}

export async function POST(req: Request) {
  const body = chatRequestSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "invalid request" }, { status: 400 });

  const { messages, cards } = body.data;
  const last = messages[messages.length - 1];
  if (last.role !== "user") return NextResponse.json({ error: "last message must be from user" }, { status: 400 });
  if (last.content.length > 300) return text("Please keep your question under 300 characters.");
  if (messages.filter((m) => m.role === "user").length > MAX_USER_TURNS) {
    return text("That's the limit for this plan. Edit your answers to start a fresh plan and ask again.");
  }

  // Deterministic guard runs before any model call.
  if (isMedicalQuestion(last.content)) return text(REFUSAL_TEXT);

  const cfg = llmConfig();
  if (!cfg) return text("The assistant is unavailable right now. The plan above still applies.", 503);

  const context = sanitizeContext(body.data.context);
  const grounding = {
    context: contextIsEmpty(context) ? null : context,
    cards: cards.map((c) => ({ action: c.action, why: c.why, steps: c.steps ?? [], owner: c.owner, urgency: c.urgency, room: c.room })),
  };

  const llmMessages: ChatMessage[] = [
    { role: "system", content: CHAT_SYSTEM },
    { role: "system", content: `Household and plan:\n${JSON.stringify(grounding)}` },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  try {
    const stream = await streamText(cfg, llmMessages, { temperature: 0.5, maxTokens: 220, signal: req.signal });
    return new Response(stream, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
  } catch {
    return text("The assistant is unavailable right now. The plan above still applies.", 503);
  }
}
