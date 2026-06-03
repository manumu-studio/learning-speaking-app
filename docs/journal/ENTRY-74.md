# ENTRY-74 — Grammar Pipeline Integration

**Date:** 2026-06-03
**Type:** Feature
**Branch:** `feat/grammar-pipeline`
**Version:** 0.67.0

---

## What I Did

Added a dedicated grammar pipeline that classifies dual-transcript divergence spans (from the verbatim ASR system) as grammar errors, self-corrections, pronunciation artifacts, or false starts. The classifier runs a second Claude Haiku call after the main analysis, using the normalized + verbatim transcripts plus divergence spans as input. Corpus evidence grounds the classification when available.

The LLM-vibes-based `verbAccuracy` score is now overridden with an evidence-based metric when grammar flags are available. The score factors in error severity weighting (verb tense > agreement > word order > preposition > other > article), speaker confidence, and corpus confirmation.

Moved `argumentClosure` from the Delivery pillar to the Language pillar — it measures discourse/argumentation quality, not delivery fluency. Delivery now has 2 metrics, Language has 7.

## Files Touched

| File | Action | Notes |
|------|--------|-------|
| `prisma/schema.prisma` | Modified | Added `grammarFlags Json?` to SpeakingSession |
| `prisma/migrations/20260603230000_add_grammar_flags_field/` | Created | Additive nullable JSONB column |
| `src/lib/analysis/grammar/grammar.types.ts` | Created | GrammarFlag, GrammarClassification, GrammarErrorType |
| `src/lib/analysis/grammar/grammarFlagSchema.ts` | Created | Zod schemas for response validation |
| `src/lib/analysis/grammar/grammarPrompt.ts` | Created | System + user prompt for classification |
| `src/lib/analysis/grammar/classifyDivergenceSpans.ts` | Created | Claude Haiku classifier call |
| `src/lib/analysis/grammar/scoreVerbAccuracy.ts` | Created | Evidence-based scoring formula |
| `src/lib/analysis/grammar/index.ts` | Created | Barrel exports |
| `src/lib/pipeline/runGrammarAnalysis.ts` | Created | Pipeline orchestrator (best-effort) |
| `src/lib/pipeline/executePipeline.ts` | Modified | Wired grammar analysis after finishVerbatim |
| `src/features/dashboard/pillars.ts` | Modified | argumentClosure → Language pillar |
| `src/lib/cefr/estimateCefr.ts` | Modified | argumentClosure → Language group |
| `src/lib/ai/synthesize.ts` | Modified | Updated "7 language metrics" in prompt |
| `src/app/(app)/session/[id]/GrammarSection/` | Created | 4-file UI component |
| `src/app/(app)/session/[id]/SessionFeedbackSections.tsx` | Modified | Wired GrammarSection |
| `src/features/session/useSessionStatus.types.ts` | Modified | Added grammarFlags to SessionDetail |

## Decisions

- **Separate Claude call** rather than extending the existing analysis — grammar classification needs verbatim data not available during the main analysis step
- **Haiku model** for classification — fast, cheap, sufficient for structured span classification
- **Best-effort pattern** — grammar analysis failure never crashes the pipeline (matches verbatim transcription pattern)
- **JSON field on session** (not separate model) — consistent with `divergenceSpans`, `registerFeedback` patterns
- **Evidence-based override** — verbAccuracy only overridden when grammar flags are successfully produced; LLM score stands as fallback

## Still Open

- Per-chunk verbatim transcription (chunked sessions skip grammar analysis)
- Dashboard sparkline for grammar error trends
- Grammar flag feedback loop (user confirms/rejects flags)

## Validation

```
npm run typecheck  ✅ Zero errors
npm run lint       ✅ No warnings
npm test -- --run  ✅ 1521 passed, 4 skipped (183 test files)
```
