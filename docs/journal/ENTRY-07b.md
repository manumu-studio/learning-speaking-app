# ENTRY-07b — Claude Analysis Client + Zod Schema (PACKET-07b)

**Date:** 2026-02-18
**Type:** Feature
**Branch:** `feature/processing-pipeline`
**Version:** `0.7.0`

---

## What I Did

Built the Claude Haiku analysis client with a Zod schema that maps exactly to the Prisma `Insight` model. The client receives a raw Whisper transcript and returns structured feedback — up to 5 recurring patterns, a `focusNext` goal, and a session summary — ready to be written directly to Postgres.

---

## Files Touched

| File | Action | Notes |
|---|---|---|
| `src/lib/ai/analyze.ts` | Created | Anthropic client + prompt + Zod schema + `analyzeTranscript()` |

---

## Decisions

**`claude-haiku-4-5-20251001` model** — Haiku is the cheapest Claude tier and fast enough for async processing. Pattern detection on a speaking transcript doesn't require Sonnet-level reasoning. Can upgrade later if output quality falls short.

**Pattern-focused prompt, not correction-focused** — Instructed Claude to find RECURRING habits across the session, not to correct every sentence. This is the right pedagogy for B2-C1+ learners: pattern awareness and targeted practice beats line-by-line correction.

**Zod schema mirrors Prisma EXACTLY** — Field names, types, and optionality in `insightSchema` were mapped field-by-field against the `Insight` model to guarantee no impedance mismatch at write time. `examples` is `Json?` in Prisma → `z.array(z.string()).optional()` in Zod. `frequency` is `Int?` → `z.number().optional()`.

**`z.array(insightSchema).max(5)`** — Hard cap on insights prevents cognitive overload and keeps API costs bounded (shorter response = fewer tokens).

**`unknown` for `JSON.parse` result** — `JSON.parse` returns `any`. Typed the result as `unknown` before passing to `analysisResultSchema.parse()`, keeping strict TypeScript compliance — `unknown` forces the Zod parse rather than allowing silent `any` propagation.

**`?? null` guard on `message.content[0]`** — The Anthropic SDK types `content` as `ContentBlock[]`, and array indexing returns `ContentBlock | undefined` under `noUncheckedIndexedAccess`. Used `?? null` + null check instead of a non-null assertion.

**Lazy singleton pattern** — Consistent with `whisper.ts` and `qstash.ts`. `ANTHROPIC_API_KEY` is optional in Zod schema; client is initialized on first call, not at import time.

---

## Validation

```bash
npx tsc --noEmit   # ✅ zero errors
npm run build      # ✅ clean build
```
