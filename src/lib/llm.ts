import type { z } from "zod";

export interface LlmConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
}

export function llmConfig(): LlmConfig | null {
  const apiKey = process.env.LLM_API_KEY ?? process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  return {
    apiKey,
    baseUrl: (process.env.LLM_BASE_URL ?? "https://api.groq.com/openai/v1").replace(/\/$/, ""),
    model: process.env.LLM_MODEL ?? "openai/gpt-oss-120b",
  };
}

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

interface CompletionOptions {
  messages: ChatMessage[];
  temperature: number;
  timeoutMs: number;
  json?: boolean;
  maxTokens?: number;
  signal?: AbortSignal;
}

async function complete(cfg: LlmConfig, opts: CompletionOptions): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs);
  opts.signal?.addEventListener("abort", () => ctrl.abort());
  try {
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify({
        model: cfg.model,
        messages: opts.messages,
        temperature: opts.temperature,
        max_tokens: opts.maxTokens ?? 1500,
        ...(opts.json ? { response_format: { type: "json_object" } } : {}),
        ...reasoningOpts(cfg.model),
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`LLM ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new Error("LLM: empty response");
    return content;
  } finally {
    clearTimeout(timer);
  }
}

/** JSON completion validated with zod; one retry on parse/validation failure. Returns null on any failure. */
export async function completeJson<T>(
  cfg: LlmConfig,
  schema: z.ZodType<T>,
  messages: ChatMessage[],
  opts: { temperature?: number; timeoutMs?: number; maxTokens?: number } = {},
): Promise<T | null> {
  const deadline = Date.now() + (opts.timeoutMs ?? 8000);
  for (let attempt = 0; attempt < 2; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining < 500) return null;
    try {
      const raw = await complete(cfg, {
        messages,
        temperature: opts.temperature ?? 0.3,
        timeoutMs: remaining,
        json: true,
        maxTokens: opts.maxTokens,
      });
      const parsed = schema.safeParse(JSON.parse(stripFences(raw)));
      if (parsed.success) return parsed.data;
      console.warn("llm: schema mismatch", parsed.error.issues.slice(0, 5));
      messages = [...messages, { role: "assistant", content: raw }, { role: "user", content: `Invalid JSON for the schema: ${parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}. Return ONLY corrected JSON.` }];
    } catch (e) {
      console.warn("llm: request failed", e instanceof Error ? e.message : e);
    }
  }
  return null;
}

/** Streams assistant text (SSE deltas) as a ReadableStream of UTF-8 chunks. */
export async function streamText(
  cfg: LlmConfig,
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number; signal?: AbortSignal } = {},
): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify({
      model: cfg.model,
      messages,
      temperature: opts.temperature ?? 0.5,
      max_tokens: opts.maxTokens ?? 300,
      stream: true,
      ...reasoningOpts(cfg.model),
    }),
    signal: opts.signal,
  });
  if (!res.ok || !res.body) throw new Error(`LLM ${res.status}: ${(await res.text()).slice(0, 200)}`);

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  return res.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith("data:")) continue;
          const payload = t.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload) as { choices?: { delta?: { content?: string } }[] };
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) controller.enqueue(encoder.encode(delta));
          } catch {
            // partial/keepalive line
          }
        }
      },
    }),
  );
}

/** Reasoning models spend the token budget thinking; keep it short for extraction/tailoring. */
function reasoningOpts(model: string): Record<string, string> {
  return /gpt-oss|qwen3|deepseek-r1/i.test(model) ? { reasoning_effort: "low" } : {};
}

function stripFences(s: string): string {
  return s.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
}
