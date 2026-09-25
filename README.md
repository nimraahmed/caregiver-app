# Home Adaptation Coach (caregiver-app)

Mobile-first web app that helps families caring for an older relative with type 2 diabetes and/or stroke turn the person's needs into concrete changes to rooms, daily routines, and caregiver responsibilities.

Every recommendation comes from a source-backed card library (`src/data/cards.json`); card selection, owner assignment, urgency, and red flags are deterministic. The LLM layer (Milestones 3–4) only extracts household context, tailors wording, and answers grounded follow-up questions — it never invents recommendations or medical advice.

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

### LLM (optional)

Without a key the app runs the deterministic plan only (no tailoring, no Ask). Any OpenAI-compatible endpoint works:

```bash
GROQ_API_KEY=...                                 # or LLM_API_KEY
LLM_BASE_URL=https://api.groq.com/openai/v1      # default
LLM_MODEL=openai/gpt-oss-120b                    # default
```

## Layout

- `src/lib/types.ts` — Profile, Card, SelectedCard types
- `src/lib/schema.ts` — zod validation + card integrity checks
- `src/lib/rules.ts` — `selectCards` (filter → supersede → reassign → urgency bump → sort)
- `src/lib/redflags.ts` — deterministic emergency / urgent-care flags (UAE 998)
- `src/lib/questions.ts` — branching intake questions
- `src/lib/guard.ts` — deterministic medical-question refusal and generated-text filters
- `src/lib/validate.ts` — LLM output schemas; `mergePlan` (reinsert omitted cards, cap urgency raises, protect safety cards)
- `src/lib/llm.ts`, `src/lib/prompts.ts` — OpenAI-compatible client, prompts
- `src/app/api/{parse,plan,chat}` — context extraction, per-card tailoring, grounded streaming chat
- `src/app/{intake,confirm,plan}` — the user flow
