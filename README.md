# Home Adaptation Companion (caregiver-app)

Mobile-first web app for families caring for an older relative at home after type 2 diabetes complications and/or a stroke. It turns the person's condition, mobility, home layout, daily routine, and who is around when into a prioritised plan: what to change in each room, what to do each day, and who does it.

Two conditions are supported today (`t2dm`, `stroke`); the card library is condition-agnostic so more can be added.

## How it works

1. **Intake** — a free-text description plus ~10 guided questions (conditions, patient's name, feet, vision, weak side, walking, stroke effects, home, "normal day", who helps, red flags).
2. **AI extraction** — `/api/parse` reads the free text, pre-fills answers, and shows the exact phrase used as evidence. Nothing is applied silently; the caregiver confirms.
3. **Deterministic plan** — `selectCards` picks cards from the source-backed library (`src/data/cards.json`), assigns an owner (patient / family / helper), urgency, and red flags. This is the *only* source of recommendations.
4. **AI tailoring** — `/api/plan` rewrites the wording and steps of the selected cards for this household. Output is validated: unknown card ids are dropped, omitted cards are reinserted, urgency can only be raised, and protected safety cards (fall risk, bathroom, feet, precautionary) keep their source wording verbatim.
5. **Grounded chat** — the Ask sheet answers questions using only the plan and household context. Medical questions are refused deterministically before any model call ("ask their doctor or nurse; if urgent call 998").
6. **Red flags** — new stroke signs or a foot wound show a 998 / urgent-care screen that blocks the plan until acknowledged.
7. **30-day check-in → dashboard → care-team summary** — the caregiver ticks what is in place and reports falls; the dashboard shows progress and the summary is a printable one-pager for the discharge nurse, OT or GP.

Everything degrades gracefully: with no key or a failed model call the deterministic plan is shown and Ask is hidden.

Full specification: `docs/spec-v3.md`.

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # vitest
npm run lint
npm run typecheck
npm run build
```

No database: state lives in the browser's sessionStorage; "Start for someone else" clears it.

### LLM

Any OpenAI-compatible endpoint works. Groq is the default:

```bash
GROQ_API_KEY=...                                 # or LLM_API_KEY (takes precedence)
LLM_BASE_URL=https://api.groq.com/openai/v1      # default
LLM_MODEL=openai/gpt-oss-120b                    # default
```

Groq's free tier has per-minute and per-day token caps per model; when hit, the app falls back to the untailored plan. For a live demo use a paid tier or point `LLM_MODEL` at a model with quota left (e.g. `openai/gpt-oss-20b`).

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Welcome; Start / Continue with saved plan |
| `/intake` → `/confirm` → `/plan` | Intake, review answers + AI evidence, plan (rooms / routine tabs, Ask, share, print) |
| `/checkin` | 30-day check-in (items done, falls, near-falls) |
| `/dashboard` | Progress, day N/30, falls, next items |
| `/summary` | Printable care-team summary |
| `POST /api/parse` | Free text → profile fields + evidence + household context |
| `POST /api/plan` | Profile → tailored cards (server recomputes selection; output validated) |
| `POST /api/chat` | Grounded Q&A with deterministic medical refusal |

All API routes are rate-limited per IP (in-memory).

## Layout

- `src/data/cards.json` — 28 cards, every one cited (NICE NG236, NHS, IWGDF 2023, Stroke Association, Age UK, RNIB…)
- `src/lib/types.ts`, `schema.ts` — Profile / Card types, zod validation, card integrity checks
- `src/lib/rules.ts` — `selectCards` (filter → supersede → reassign → urgency bump → sort)
- `src/lib/responsibility.ts` — deterministic owner labels ("Baba does this", "Family does this", "Helper does this")
- `src/lib/redflags.ts` — emergency / urgent-care flags (UAE 998)
- `src/lib/questions.ts`, `parseClient.ts` — intake questions and how parsed fields map onto them
- `src/lib/guard.ts` — medical-question refusal and generated-text filters
- `src/lib/validate.ts` — LLM output schemas; `mergePlan` (reinsert, clamp urgency, protect safety cards)
- `src/lib/llm.ts`, `prompts.ts` — OpenAI-compatible client and prompts
- `src/lib/checkin.ts`, `summary.ts`, `share.ts` — check-in metrics, care-team summary, WhatsApp share text
- `src/lib/store.ts`, `usePlan.ts` — sessionStorage state and plan loading (deterministic first, tailored swapped in)
- `src/app/api/{parse,plan,chat}` — API routes
- `src/components/` — IntakeFlow, QuestionBody, PlanCard, AskSheet, ContextChips, ui

## Tests

`npm test` runs 64 vitest tests: card library integrity and sources, rules engine per condition, red flags, LLM output validation (fake ids, urgency clamp, protected cards, medication text), refusal guard, check-in metrics.

## Safety principles

- The library is the only source of recommendations; the model cannot add one.
- Safety-critical decisions (selection, owner, urgency, red flags, medical refusal) are code, not prompts.
- Medication, diagnosis and dosing never appear in generated text or context chips.
- Cards show their source; nothing ships as "source pending".
