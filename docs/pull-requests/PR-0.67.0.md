# PR-0.67.0 — Grammar Pipeline Integration

**Branch:** `feat/grammar-pipeline` → `main`
**Version:** 0.67.0
**Date:** 2026-06-03
**Status:** ✅ Ready to merge

---

## Summary

Adds a dedicated grammar pipeline that classifies divergence spans from the dual-transcript system (PACKET-47) into grammar errors, self-corrections, pronunciation artifacts, and false starts. Replaces the vibes-based `verbAccuracy` score with evidence-based scoring. Moves `argumentClosure` from Delivery to Language pillar.

## Files Changed

| File | Action | Notes |
|------|--------|-------|
| `prisma/schema.prisma` | Modified | `grammarFlags Json?` on SpeakingSession |
| `prisma/migrations/20260603230000_*` | Created | Nullable JSONB column |
| `src/lib/analysis/grammar/*` | Created | 6 files — types, schemas, prompt, classifier, scorer, barrel |
| `src/lib/pipeline/runGrammarAnalysis.ts` | Created | Pipeline orchestrator |
| `src/lib/pipeline/executePipeline.ts` | Modified | +2 lines (import + call) |
| `src/features/dashboard/pillars.ts` | Modified | argumentClosure → Language |
| `src/lib/cefr/estimateCefr.ts` | Modified | Pillar group update |
| `src/lib/ai/synthesize.ts` | Modified | "7 language metrics" in prompt |
| `src/app/(app)/session/[id]/GrammarSection/*` | Created | 3-file UI component |
| `src/app/(app)/session/[id]/SessionFeedbackSections.tsx` | Modified | Wire GrammarSection |
| `src/features/session/useSessionStatus.types.ts` | Modified | grammarFlags field |
| 5 test files | Modified | Pillar move test updates |
| 5 test files | Created | Grammar module + pipeline tests |

## Architecture Decisions

| Decision | Why |
|----------|-----|
| Separate Claude call (not extending existing analysis) | Grammar needs verbatim + divergence data not available during main analysis |
| Haiku for classification | Structured classification task — speed/cost over reasoning depth |
| Best-effort error handling | Matches verbatim pattern; grammar failure must never crash the pipeline |
| JSON on session (not separate model) | Consistent with divergenceSpans, registerFeedback patterns |
| Re-compute corpus evidence | Cheaper than restructuring runAnalysis return type; formatCorpusPrompt is a pure function |
| argumentClosure → Language | Measures discourse skill, not delivery fluency |

## Testing Checklist

- [x] `npm run typecheck` — zero errors
- [x] `npm run lint` — no warnings
- [x] `npm test -- --run` — 1521 passed, 4 skipped
- [x] Zod schema tests cover all classification/error type enums
- [x] Prompt builder tests verify transcript and span formatting
- [x] Classifier tests cover empty input, happy path, fence stripping, error cases
- [x] Scoring tests cover severity weights, corpus boost, clamping, level thresholds
- [x] Pipeline integration tests cover all guard clauses and error resilience
- [x] Pillar tests updated for argumentClosure move

## Deployment Notes

1. Run `prisma migrate deploy` before deploying — adds nullable `grammarFlags` JSONB column
2. No new env vars required (uses existing ANTHROPIC_API_KEY for the grammar classifier)
3. Grammar analysis is best-effort — safe to deploy without changes to existing sessions
4. Existing sessions will have `grammarFlags: null` and display no grammar section in the UI
