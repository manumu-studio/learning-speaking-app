# Entry 73

**Date:** 2026-06-03
**Type:** Feature
**Branch:** `feat/verbatim-asr`
**Version:** `0.66.0`

## What I Did

Added a second transcription path that runs in parallel with Whisper and produces a verbatim copy of the user's speech — one that keeps all the messy stuff: filler words, false starts, repetitions, and self-corrections. Whisper stays the display transcript because it normalises speech nicely, but the verbatim version is what you actually need to detect grammar errors and disfluency patterns.

Once both transcripts are available, a Levenshtein word-alignment pass diffs them to find "divergence spans" — positions where the two transcripts disagree. Those spans are the candidates for grammar-error or disfluency classification that the next change will act on.

The whole verbatim path is best-effort. If the API key is missing or the provider returns an error, the pipeline continues on Whisper alone. Nothing breaks; you just get less data. Cost is about $0.0035 per 60-second session, and the free tier covers 185 hours.

## Files Touched

| File | Role |
|------|------|
| `src/lib/env.ts` | Added `ASSEMBLYAI_API_KEY` (optional) |
| `src/lib/assemblyai/client.ts` | Lazy-singleton client |
| `src/lib/assemblyai/client.test.ts` | 2 client tests (singleton reuse, missing-key throw) |
| `src/lib/assemblyai/transcribe.ts` | Verbatim transcription (Zod-validated, graceful failure) |
| `src/lib/assemblyai/transcribe.test.ts` | 5 unit tests |
| `src/lib/analysis/divergence/divergence.types.ts` | `AlignmentOp`, `DivergenceSpan` types |
| `src/lib/analysis/divergence/align.ts` | Levenshtein word-alignment |
| `src/lib/analysis/divergence/detectDivergence.ts` | Divergence-span detection |
| `src/lib/analysis/divergence/index.ts` | Barrel export |
| `src/lib/analysis/divergence/align.test.ts` | 6 alignment tests |
| `src/lib/analysis/divergence/detectDivergence.test.ts` | 5 divergence-detection tests |
| `src/lib/pipeline/runVerbatim.ts` | Parallel kickoff + persistence helper |
| `src/lib/pipeline/runVerbatim.test.ts` | 5 integration tests |
| `src/lib/pipeline/executePipeline.ts` | Verbatim step wired in parallel with Whisper |
| `src/lib/pipeline/executePipeline.test.ts` | Updated mock for new step |
| `prisma/schema.prisma` | 4 nullable fields on `SpeakingSession` |
| `prisma/migrations/20260603215734_add_verbatim_asr_fields/migration.sql` | Additive migration |
| `package.json` | Version bump to `0.66.0` |

## Decisions

**Why a second verbatim ASR path instead of repurposing Whisper?**
Whisper is deliberately opinionated — it normalises contractions, removes hesitations, and corrects minor grammatical slips to make transcripts readable. That behaviour is exactly what you want for display, but it erases the signal you need to detect disfluency and grammar errors. A separate, verbatim-preserving provider is the cleanest way to get both things at once.

**Why run it in parallel and best-effort?**
Parallelism costs nothing in latency — both calls fire concurrently, and the fan-in waits for whichever finishes last. Making it best-effort means the feature can be introduced gradually: the pipeline is fully functional without the new API key, and verbatim data accumulates as soon as the key is added in environment settings.

**Why a diff-based approach for divergence detection?**
The two transcripts cover the same audio, so their disagreements are structurally meaningful. A Levenshtein word-alignment is deterministic, cheap, and produces well-typed spans that downstream classification can act on. No embeddings or inference step required at this stage — that comes later when we know what the spans mean.

**Why four nullable columns on `SpeakingSession` rather than a separate table?**
The verbatim data is always session-scoped and always read together with the session record. A join would add overhead without benefit. All four columns are nullable, so existing rows are unaffected and no backfill is needed.

## Still Open

- **Migration application:** There is a pre-existing migration-history drift on the `fix_lexeme_pos_nullable` migration. The new migration must be applied alongside it once that drift is resolved. The pipeline runs fine in the interim because verbatim persistence is best-effort.
- **Divergence classification:** The spans are detected and stored, but classifying them into grammar-error categories (agreement, tense, article, etc.) is the next step, planned for the grammar-pipeline change.

## Validation

```
npm run typecheck     ✅  zero errors
npm run lint          ✅  zero warnings
npm run test:coverage ✅  178 files, 1435 passed, 4 skipped, 0 failures; coverage thresholds met
```
