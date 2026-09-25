import { NextResponse } from "next/server";
import { allowRequest, rateLimited } from "@/lib/ratelimit";
import { CARDS } from "@/lib/cards";
import { completeJson, llmConfig } from "@/lib/llm";
import { PLAN_SYSTEM } from "@/lib/prompts";
import { selectCards } from "@/lib/rules";
import { profileSchema } from "@/lib/schema";
import { contextIsEmpty, mergePlan, planOutputSchema, sanitizeContext, untailoredPlan } from "@/lib/validate";

export const maxDuration = 30;

export async function POST(req: Request) {
  if (!allowRequest(req, "plan", 20)) return rateLimited();
  const body = profileSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "invalid profile" }, { status: 400 });

  const profile = body.data;
  // Selection is always recomputed server-side; the client never chooses cards.
  const selected = selectCards(profile, CARDS);

  const cfg = llmConfig();
  if (!cfg || selected.length === 0) return NextResponse.json({ fallback: true, plan: untailoredPlan(selected) });

  const context = sanitizeContext(profile.context);
  // Red-flag fields never reach the model.
  const {
    open_foot_wound: _wound,
    new_stroke_signs: _signs,
    free_text: _text,
    context: _ctx,
    ...safeProfile
  } = profile;
  void _wound; void _signs; void _text; void _ctx;

  const strongerSide = profile.weak_side === "left" ? "right" : profile.weak_side === "right" ? "left" : null;
  const payload = {
    profile: { ...safeProfile, ...(strongerSide ? { stronger_side: strongerSide } : {}) },
    context: contextIsEmpty(context) ? null : context,
    cards: selected.map((c) => ({
      id: c.id,
      action: c.action,
      why: c.why,
      owner: c.owner,
      urgency: c.urgency,
      room: c.room,
      kind: c.kind,
      ...(c.reassigned_reason ? { reassigned_reason: c.reassigned_reason } : {}),
    })),
  };

  const out = await completeJson(
    cfg,
    planOutputSchema,
    [
      { role: "system", content: PLAN_SYSTEM },
      { role: "user", content: JSON.stringify(payload) },
    ],
    { timeoutMs: 20000, maxTokens: 6000 },
  );

  const plan = mergePlan(selected, out);
  return NextResponse.json({ fallback: out === null, plan });
}
