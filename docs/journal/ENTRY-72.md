# Entry 72

**Date:** 2026-06-03
**Type:** Feature
**Branch:** `feat/corpus-grounded-scoring`
**Version:** 0.64.0 → 0.65.0

## Summary

Wired corpus frequency data into the analysis pipeline. Claude now receives structured evidence (word frequency, CEFR levels, collocation attestation, MWE data) alongside each transcript, producing better-grounded vocabulary and naturalness scoring. A hybrid decision rule can confirm or override Claude's naturalness judgments when corpus data is strong.

## What Changed

### New modules
- **Corpus evidence builder** (`src/lib/analysis/buildCorpusEvidence.ts`) — extracts candidates from transcript, runs 3 parallel batch lookups against corpus tables
- **Hybrid scoring engine** (`src/lib/analysis/hybridScoring.ts`) — 6-row decision table combining corpus signal strength with LLM confidence
- **Corpus prompt formatter** (`src/lib/analysis/formatCorpusPrompt.ts`) — generates XML `<corpus-evidence>` section for Claude's user prompt
- **Transcript candidate extractor** (`src/lib/analysis/extractTranscriptCandidates.ts`) — stop-word-filtered content words, bigrams, and 2-4 ngrams
- **Batch corpus functions** (`src/lib/corpus/batchFindCollocations.ts`, `batchAttestExpressions.ts`) — single-query multi-item lookups
- **Analysis types** (`src/lib/analysis/analysis.types.ts`) — CorpusEvidence, HybridVerdict, HybridScoringResult

### Modified modules
- **analyzeTranscript** — refactored from 4 positional params to options object; accepts corpus evidence
- **buildUserPrompt** — refactored to options object; injects corpus evidence XML before transcript
- **confidenceGate** — Tier 2 implemented: Claude-flagged items get corpus confirmation with logDice/MI data
- **executePipeline** — corpus lookup step added before Claude analysis with observability logging
- **processFinal** — corpus lookup step + evidence flows through to naturalness enrichment
- **processChunkIndependent** — updated to new analyzeTranscript signature

### Key decisions
- Refactored `analyzeTranscript`/`buildUserPrompt` to options objects — max-params (4) would be exceeded otherwise
- Batch functions use single Prisma queries with `OR` conditions (no N+1)
- MWE batch uses exact lemmaKey match only (no pg_trgm fuzzy) for batch performance
- `processParallelFinal` deferred — it uses `synthesizeAnalysis` instead of `analyzeTranscript`
- Split `scoreExpression` into sub-functions to stay under cyclomatic complexity 15

## Files Created
- `src/lib/analysis/analysis.types.ts`
- `src/lib/analysis/buildCorpusEvidence.ts`
- `src/lib/analysis/extractTranscriptCandidates.ts`
- `src/lib/analysis/formatCorpusPrompt.ts`
- `src/lib/analysis/hybridScoring.ts`
- `src/lib/corpus/batchFindCollocations.ts`
- `src/lib/corpus/batchAttestExpressions.ts`
- `src/lib/ai/analyzeTranscript.types.ts`

## Files Modified
- `src/lib/ai/analyze.ts`
- `src/lib/ai/analyzePrompts.ts`
- `src/lib/ai/analyze.test.ts`
- `src/lib/naturalness/confidenceGate.ts`
- `src/lib/pipeline/executePipeline.ts`
- `src/lib/pipeline/executePipeline.test.ts`
- `src/lib/pipeline/processFinal.ts`
- `src/lib/pipeline/__tests__/processFinal.test.ts`
- `src/lib/pipeline/processChunkIndependent.ts`
- `src/lib/corpus/index.ts`

## Tests Created
- `src/lib/analysis/hybridScoring.test.ts` — 22 tests (6 decision table rows + helpers)
- `src/lib/analysis/extractTranscriptCandidates.test.ts` — 11 tests
- `src/lib/analysis/formatCorpusPrompt.test.ts` — 10 tests
- `src/lib/corpus/batchFindCollocations.test.ts` — 6 tests
- `src/lib/corpus/batchAttestExpressions.test.ts` — 6 tests
- `src/lib/naturalness/confidenceGate.test.ts` — 4 new Tier 2 tests added to existing file

## Test Results
- 173 test files, 1412 tests, 0 failures
- Coverage: 70.85% stmts / 83.56% branches / 93.75% funcs / 70.85% lines
- All quality gates pass: typecheck, lint, build
