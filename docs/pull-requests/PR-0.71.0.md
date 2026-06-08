# PR — v0.71.0 Metric Source Arbitration

**Branch:** `fix/assemblyai-metric-source-routing`
**Version:** 0.71.0

## Summary

Routes each scoring metric to its correct transcript source. Previously, all 9 metrics were scored from Whisper-only, ignoring the AssemblyAI verbatim data entirely. This PR fixes the routing so verbatim-dependent metrics (fillerUsage, registerPragmatics, naturalness, connectorRepetition) use speaker-filtered verbatim evidence, while vocabulary/structure metrics continue using Whisper's cleaned output.

## What Changed

### Metric Source Routing

| Source | Metrics |
|--------|---------|
| AssemblyAI verbatim (filtered) | fillerUsage (deterministic), registerPragmatics, naturalness, connectorRepetition (supporting) |
| Whisper (cleaned) | structuralVariety, vocabularyPrecision, lexicalSophistication, argumentClosure |
| Azure timings | speakingRate (already correct) |
| Grammar pipeline | verbAccuracy (architecture exists) |

### Speaker Filtering

AI coach speech (opening prompts, closing feedback, mid-session probes) now removed from verbatim transcripts before scoring. Conservative heuristic: segments by 2s silence gaps, removes blocks ≤15 words matching coach phrase patterns. Uncertain blocks kept.

### Deterministic Overrides

- **fillerUsage**: counted from verbatim text (single-word: uh/um/eh/er/ah/hm/hmm/erm; multi-word: you know/i mean/sort of/kind of; context-aware "like"). Density-to-score mapping replaces LLM estimation.
- **speakingRate**: preserved from Azure timings (was already correct but could be overwritten by synthesis).
- Source-owned metrics excluded from synthesis persistence via positive allowlist.

### Pipeline Reorder

- **Chunked path**: verbatim stitch moved before synthesis → Claude sees both transcripts with routing instructions
- **Non-chunked path**: parallelism preserved; overrides applied in `finally` block after both analysis and verbatim complete

### Grammar Pipeline Reliability

- Structured logging: `grammar-pipeline-start`, `grammar-pipeline-skip` (with reason), `grammar-classifier-failed`
- Explicit empty flags: `grammarFlags: []` when no errors found (vs `null` = didn't run)
- Inner try/catch on classifier: failure leaves flags null, doesn't crash pipeline
- Classifier prompt context receives the same filtered verbatim text used for divergence/filler scoring when available in the current pipeline run

## Architecture Decisions

1. **Positive allowlist, never `notIn`**: `deleteMany` uses `key: { in: keysToWrite }` to scope deletions. This prevents accidentally deleting Azure-derived metrics.
2. **Conditional spread for optional fields**: `...(verbatimResult ? { verbatimTranscript: verbatimResult.filtered.text } : {})` to satisfy `exactOptionalPropertyTypes`.
3. **Filtered grammar context override**: `runGrammarAnalysis` keeps raw DB verbatim as a fallback, but current pipeline runs pass filtered verbatim directly so grammar classification is not polluted by coach speech.
4. **Extracted helpers for lint compliance**: `classifyAndPersist` (options object pattern), `upsertDeterministicFiller`, `buildNote`/`countSingleWordFillers`/`countMultiWordFillers` to stay under complexity and line limits.

## Test Coverage

- 88 new/updated test assertions across 7 test files
- filterSpeakerUtterances: 7 tests (coach detection, conservative behavior, text fallback)
- countVerbatimFillers: 27 tests (filler lexicon, density mapping, like disambiguation, edge cases)
- sourceOwnedMetrics: 5 tests (type guard correctness)
- upsertDeterministicFiller: 2 tests (upsert persistence)
- synthesize: 4 new tests (verbatim routing, source instructions, deterministic exclusion)
- runGrammarAnalysis: 2 new tests + updated assertions (classifier-empty, filtered context override, log messages)
- runVerbatim: 1 new test + rewritten existing (divergence from filtered, return types)

## Deployment Notes

- No database migration required
- No new environment variables
- Backward compatible: when verbatim data is absent, synthesis falls back to Whisper-only (same as before)
- Deterministic filler upsert creates new fillerUsage MetricSnapshot rows if none exist (upsert, not create)
