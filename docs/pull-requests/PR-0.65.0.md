# PR — Corpus-Grounded Scoring (v0.65.0)

## Summary

Wire corpus frequency data into the analysis pipeline so Claude receives structured evidence alongside every transcript. Add a hybrid scoring engine that can confirm or override LLM naturalness judgments using corpus signal strength. Implement naturalness Tier 2 (corpus-confirmed confidence upgrades).

## What Was Built

### Corpus Evidence Pipeline
- **Evidence builder** orchestrates 3 parallel batch lookups (vocabulary, collocations, MWEs) against the 140k-row corpus from v0.64.0
- **Prompt formatter** generates structured XML `<corpus-evidence>` section injected into Claude's user prompt — includes word frequency, CEFR levels, collocation attestation with MI scores, and MWE data
- **Transcript extractor** tokenizes transcripts into content words, adjacent-word bigrams, and 2-4 word ngrams for lookup candidates

### Hybrid Scoring Engine
- 6-row decision table combining corpus attestation strength (strong/mid/weak/absent) with Claude's confidence to produce verdicts: PASS, PASS_CORPUS_OVERRIDE, FLAG, PASS_WITH_NOTE, SOFT_FLAG, DEFER_TO_LLM
- CEFR boost detection (C1/C2 + attested) and B1 filler detection (high-freq low-level words)

### Naturalness Tier 2
- Claude-flagged naturalness issues now get corpus confirmation via logDice/MI scores
- `collocationMetric` and `metricValue` fields (previously always null) now populated from corpus data
- Confidence upgrades: high (logDice ≥ 5), medium (attested but moderate), low (no corpus match)

### API Refactor
- `analyzeTranscript` and `buildUserPrompt` refactored from 4 positional params to options objects (max-params compliance)
- All 3 pipeline callers updated (executePipeline, processFinal, processChunkIndependent)

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Options objects for analyzeTranscript/buildUserPrompt | Max-params (4) would be exceeded; options pattern is extensible |
| Batch functions with single Prisma queries | 50+ word pairs per transcript would cause N+1; OR conditions batch into 1 query |
| MWE batch: exact match only (no pg_trgm) | Fuzzy matching per-item is too expensive in batch; exact lemmaKey match via indexed column |
| processParallelFinal deferred | Uses synthesizeAnalysis (different code path); separate integration scope |
| Corpus evidence before transcript in prompt | Claude sees the data before reading the transcript — enables inline grounding |

## Testing

- 67 new tests across 8 files
- All 6 hybrid scoring decision table rows covered with boundary values
- Corpus evidence builder tested with mocked corpus functions (7 cases)
- Naturalness enrichment tested for all confidence upgrade paths including low-logDice medium tier
- Pipeline tests updated with buildCorpusEvidence mock
- **173 test files, 1412 tests, 0 failures**

## Quality Gates

| Gate | Status |
|------|--------|
| `npm run typecheck` | ✅ Zero errors |
| `npm run lint` | ✅ Zero warnings |
| `npm run build` | ✅ Clean build |
| `npm test` | ✅ 1404 passed |

## Deployment Notes

- **No new env vars** — uses existing Prisma/Postgres connection
- **No new migrations** — corpus tables already exist from v0.64.0
- **No breaking API changes** — all changes are internal pipeline
- **Performance:** corpus lookup adds ~3 parallel DB queries per session (target < 50ms)
