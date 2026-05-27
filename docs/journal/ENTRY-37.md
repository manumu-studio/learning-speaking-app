# ENTRY-37 — AI Analysis Quality
**Date:** 2026-05-27
**Type:** Feature
**Branch:** `feat/ai-analysis-quality`
**Version:** `0.34.0`
---
## What I Did

Enriched Claude transcript analysis with three new optional dimensions — coherence scoring, vocabulary diversity metrics, and Spanish L1 interference detection — and restructured the API call to use a proper system prompt with chain-of-thought user instructions. Added growth-framed tone calibration rules and Redis-backed caching keyed by transcript SHA-256 hash to skip redundant Claude calls on repeat views.

## Files Touched
| File | Action | Notes |
|------|--------|-------|
| `src/lib/ai/analyze.ts` | Modified | New Zod fields, system/user prompt split, CoT, tone rules, cache integration |
| `src/lib/ai/analysisCache.ts` | Created | Redis get/set with 7-day TTL |
| `src/lib/ai/analyze.test.ts` | Modified | Schema, caching, and system prompt tests |
| `src/lib/ai/analysisCache.test.ts` | Created | Hash, hit/miss, graceful degradation tests |

## Decisions
- **System + user prompt split** — Anthropic's `system` parameter separates role/rules/schema from transcript data, improving JSON adherence versus one concatenated user blob.
- **SHA-256 transcript hash as cache key** — Deterministic, collision-resistant, and stores no PII in the key itself.
- **Fire-and-forget cache write** — Redis failures must never block the user response; `void setCachedAnalysis(...)` with internal error swallowing.
- **Optional schema fields** — `coherenceScore`, `vocabularyDiversity`, and `l1Interference` are optional so existing session records remain valid without migration.
- **Claude-estimated TTR** — Avoids adding a tokenization dependency; heuristic TTR is sufficient for coaching feedback at this stage.
- **Dynamic import of cache module** — Breaks a circular dependency between `analyze.ts` and `analysisCache.ts` that caused a production build failure.

## Still Open
- Results UI does not yet surface `coherenceScore`, `vocabularyDiversity.repetitionFlags`, or `l1Interference` — data is validated and stored in the analysis payload but not rendered.
- Cache invalidation on prompt schema change requires bumping the `v1` key prefix manually.
- L1 interference detection is prompt-only; no cross-check against Azure phoneme tags yet.

## Validation
```bash
npx tsc --noEmit — exit 0
npm run lint — ✔ No ESLint warnings or errors
npm run test — 316 passed | 4 skipped
npm run build — ✓ Compiled successfully
```
