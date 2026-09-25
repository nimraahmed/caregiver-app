"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CARDS } from "./cards";
import { selectCards } from "./rules";
import { useAppState } from "./store";
import type { Profile } from "./types";
import { untailoredPlan, type TailoredPlan } from "./validate";

export function planKey(p: Profile): string {
  const { free_text: _t, ...rest } = p;
  void _t;
  return JSON.stringify(rest);
}

/**
 * Deterministic plan is available immediately; the tailored version replaces it when /api/plan
 * responds and is cached in session state under the profile key. Any failure keeps the stored text.
 */
export function usePlan(enabled: boolean): { plan: TailoredPlan; loading: boolean; aiUnavailable: boolean } {
  const { state, update } = useAppState();
  const p = state.profile;
  const key = useMemo(() => planKey(p), [p]);
  const base = useMemo(() => untailoredPlan(p.conditions.length ? selectCards(p, CARDS) : []), [p]);
  const stored = state.plan && state.plan.key === key ? state.plan : null;
  // Fallbacks are remembered only for this mount so a recovered model is retried on the next visit.
  const [failed, setFailed] = useState<string | null>(null);
  const cached = stored ?? (failed === key ? { key, plan: base, fallback: true } : null);
  const settled = cached !== null;
  const inflight = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || settled || p.conditions.length === 0 || inflight.current === key) return;
    inflight.current = key;
    const ctrl = new AbortController();
    (async () => {
      let result: { fallback: boolean; plan: TailoredPlan } | null = null;
      try {
        const r = await fetch("/api/plan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(p), signal: ctrl.signal });
        if (r.ok) result = (await r.json()) as { fallback: boolean; plan: TailoredPlan };
      } catch {
        result = null;
      }
      if (ctrl.signal.aborted) return;
      inflight.current = null;
      if (!result || result.fallback) {
        setFailed(key);
        return;
      }
      update((s) => (planKey(s.profile) === key ? { ...s, plan: { key, plan: result.plan, fallback: false } } : s));
    })();
    return () => {
      ctrl.abort();
      if (inflight.current === key) inflight.current = null;
    };
  }, [enabled, key, settled, p, update]);

  return {
    plan: cached?.plan ?? base,
    loading: enabled && !cached && p.conditions.length > 0,
    aiUnavailable: cached?.fallback ?? false,
  };
}
