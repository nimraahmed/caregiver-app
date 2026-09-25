import { NextResponse } from "next/server";
import { z } from "zod";
import { completeJson, llmConfig } from "@/lib/llm";
import { PARSE_SYSTEM } from "@/lib/prompts";
import { parseOutputSchema, toParseResult } from "@/lib/validate";

export const maxDuration = 30;

const requestSchema = z.object({ text: z.string().trim().min(1).max(500) });

export async function POST(req: Request) {
  const body = requestSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "text (1–500 chars) required" }, { status: 400 });

  const cfg = llmConfig();
  if (!cfg) return NextResponse.json({ fallback: true });

  const out = await completeJson(cfg, parseOutputSchema, [
    { role: "system", content: PARSE_SYSTEM },
    { role: "user", content: body.data.text },
  ]);
  if (!out) return NextResponse.json({ fallback: true });

  return NextResponse.json({ fallback: false, ...toParseResult(out) });
}
