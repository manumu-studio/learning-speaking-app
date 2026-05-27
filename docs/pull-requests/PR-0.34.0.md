# PR-v0.34.0 — AI Analysis Quality
**Branch:** `feat/ai-analysis-quality` → `main`
**Version:** `0.34.0`
**Date:** 2026-05-27
**Status:** ✅ Ready to merge
---
## Summary
- Adds three enriched analysis dimensions: coherence/discourse scoring, vocabulary diversity (TTR, AWL count, repetition flags with alternatives), and Spanish L1 interference detection (calques, false cognates, syntax patterns)
- Restructures Claude calls to use a dedicated `system` prompt with hard rules and JSON schema, plus a chain-of-thought user prompt with the transcript
- Calibrates feedback tone to growth-framing language across all text fields
- Caches analysis results in Upstash Redis for 7 days keyed by transcript hash — cache hits bypass Claude entirely

## Files Changed
| File | Action | Notes |
|------|--------|-------|
| `src/lib/ai/analyze.ts` | Modified | Schema, prompts, system/user split, cache wiring |
| `src/lib/ai/analysisCache.ts` | Created | Redis-backed cache module |
| `src/lib/ai/analyze.test.ts` | Modified | Schema + integration tests |
| `src/lib/ai/analysisCache.test.ts` | Created | Cache unit tests |

## Architecture Decisions
| Decision | Why |
|----------|-----|
| System + user prompt split | Clearer instruction/data separation; better JSON format adherence |
| Chain-of-thought in user turn | Reason-before-JSON reduces schema violations without exposing thinking in output |
| Optional new schema fields | Backward compatible with existing sessions; no DB migration required |
| SHA-256 cache key with `v1` prefix | Deterministic, PII-free; version prefix allows future schema invalidation |
| Fire-and-forget cache write | Redis outage must not delay or fail the analysis response |
| Dynamic import for cache module | Avoids circular dependency between analyze and cache at module init |

## Testing Checklist
- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes
- [x] `npm run test` passes (316 tests)
- [x] `npm run build` succeeds
- [ ] New sessions return `coherenceScore` in analysis JSON (manual)
- [ ] Repeat view of same session hits Redis cache (manual — check logs for skipped Claude call)
- [ ] Existing sessions without new fields still load correctly (manual)

## Deployment Notes
- No new environment variables required — Upstash Redis already provisioned via `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
- Cache degrades gracefully when Redis is unavailable — analysis still works via direct Claude call
- `max_tokens` increased from 2048 to 3072 (~$0.00015 extra per session at Haiku pricing)

## How to Validate Locally
1. Start dev server: `npm run dev`
2. Record and process a speaking session
3. Inspect the session analysis payload — confirm `coherenceScore`, `vocabularyDiversity`, and `l1Interference` are present
4. Refresh the results page — second load should be faster (cache hit if Redis is configured)
5. Run `npm run test` to confirm all 316 tests pass

## Validation
```
npx tsc --noEmit → exit 0
npm run lint → ✔ No ESLint warnings or errors
npm run test → 316 passed | 4 skipped
npm run build → ✓ Compiled successfully
```
