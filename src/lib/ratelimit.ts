const WINDOW_MS = 60_000;
const buckets = new Map<string, { count: number; reset: number }>();

/** Fixed-window per-IP limiter (in-memory, per server instance). Returns true when the call is allowed. */
export function allowRequest(req: Request, route: string, limit: number): boolean {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
  const key = `${route}:${ip}`;
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset <= now) {
    if (buckets.size > 5000) for (const [k, v] of buckets) if (v.reset <= now) buckets.delete(k);
    buckets.set(key, { count: 1, reset: now + WINDOW_MS });
    return true;
  }
  b.count += 1;
  return b.count <= limit;
}

export function rateLimited() {
  return new Response("Too many requests — please wait a minute and try again.", {
    status: 429,
    headers: { "content-type": "text/plain; charset=utf-8", "retry-after": "60" },
  });
}
