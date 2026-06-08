# Entry 78

**Date:** 2026-06-08
**Type:** Architecture fix
**Branch:** fix/assemblyai-metric-source-routing
**Version:** 0.71.0

## Summary

Implemented metric source arbitration — each scoring metric now uses its correct transcript source instead of Whisper-only. Verbatim transcripts are filtered for coach speech, filler counts are deterministic, speakingRate comes from Azure timings, and the grammar pipeline has structured observability with filtered verbatim context.

## Key Decisions

- **Deterministic-first:** fillerUsage and speakingRate are computed from raw data, not LLM-estimated. The persistence layer discards LLM scores for these "source-owned" metrics using a positive allowlist (`in: keysToWrite`), never `notIn`.
- **Conservative speaker filtering:** Heuristic-only MVP — segments words by 2s silence gaps, classifies blocks via coach phrase patterns. Blocks >15 words are always kept. Uncertain utterances preserved (false negatives < false positives).
- **Pipeline reorder (chunked):** Verbatim stitch moved before synthesis so Claude sees both Whisper and verbatim transcripts when scoring. The prompt includes explicit routing instructions (Whisper for vocabulary/structure, verbatim for register/naturalness).
- **Parallelism preserved (non-chunked):** Analysis runs concurrently with verbatim; post-analysis overrides applied after both complete in the `finally` block.
- **Grammar null/empty distinction:** `grammarFlags: null` means pipeline didn't run or failed; `grammarFlags: []` means it ran clean. Zero divergence spans now explicitly persists empty array, and classifier prompts use filtered verbatim context when the current pipeline run has it in memory.

## Files Created

- `src/lib/analysis/filterSpeakerUtterances.ts` — speaker filtering pure function
- `src/lib/analysis/countVerbatimFillers.ts` — deterministic filler counting with density-to-score mapping
- `src/lib/pipeline/sourceOwnedMetrics.ts` — shared constant + type guard for source-owned metric keys
- `src/lib/pipeline/upsertDeterministicFiller.ts` — DB persistence helper for verbatim-derived fillerUsage
- `src/lib/analysis/filterSpeakerUtterances.test.ts` — 7 tests
- `src/lib/analysis/countVerbatimFillers.test.ts` — 27 tests
- `src/lib/pipeline/sourceOwnedMetrics.test.ts` — 5 tests
- `src/lib/pipeline/upsertDeterministicFiller.test.ts` — 2 tests

## Files Modified

- `src/lib/pipeline/stitchVerbatim.ts` — return type changed from void to StitchedVerbatimResult, integrates speaker filtering + divergence on filtered words
- `src/lib/pipeline/processParallelFinal.ts` — reordered stitch before synthesis, passes verbatim to synthesis prompt, adds deterministic filler upsert, filters source-owned metrics from synthesis persistence
- `src/lib/pipeline/runVerbatim.ts` — return type changed to FinishedVerbatimResult, integrates speaker filtering + divergence detection
- `src/lib/pipeline/executePipeline.ts` — post-analysis overrides in finally block (filler upsert + grammar)
- `src/lib/pipeline/executePipelineHelpers.ts` — storeMetrics filters out source-owned metrics, deleteMany uses `in: keysToWrite`
- `src/lib/ai/synthesize.ts` — optional verbatimTranscript field, source routing instructions in prompt
- `src/lib/pipeline/runGrammarAnalysis.ts` — structured logging, explicit empty flags persistence, filtered verbatim override, extracted classifyAndPersist helper
- `src/lib/analysis/grammar/classifyDivergenceSpans.ts` — classifier input/output logging, safeParse
- `src/lib/ai/synthesize.test.ts` — 4 new verbatim routing tests
- `src/lib/pipeline/runGrammarAnalysis.test.ts` — updated assertions for new log messages + 2 new tests
- `src/lib/pipeline/runVerbatim.test.ts` — rewritten for new return types + divergence verification
- `src/lib/pipeline/__tests__/processFinal.test.ts` — added upsert mock
