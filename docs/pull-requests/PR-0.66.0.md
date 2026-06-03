# PR-0.66.0 — Verbatim ASR + Dual-Transcript Divergence

**Branch:** `feat/verbatim-asr` → `main`
**Version:** `0.66.0`
**Date:** 2026-06-03
**Status:** Ready to merge

---

## Summary

Adds a second, parallel transcription path using AssemblyAI Universal-3-Pro to produce a verbatim copy of every session — one that preserves fillers, false starts, repetitions, and self-corrections that Whisper normalises away. A Levenshtein word-alignment algorithm diffs the verbatim transcript against the Whisper display transcript to find "divergence spans": positions where the two disagree. Those spans are stored alongside the session and will feed downstream grammar-error and disfluency classification.

The verbatim path is best-effort. A missing API key or a transient provider error leaves the existing pipeline fully intact.

---

## Files Changed

| File | Action | Notes |
|------|--------|-------|
| `src/lib/env.ts` | Modified | Added `ASSEMBLYAI_API_KEY` (optional) |
| `src/lib/assemblyai/client.ts` | Created | Lazy-singleton AssemblyAI SDK client |
| `src/lib/assemblyai/transcribe.ts` | Created | Verbatim transcription (Zod-validated, graceful failure) |
| `src/lib/assemblyai/transcribe.test.ts` | Created | 5 unit tests |
| `src/lib/analysis/divergence/divergence.types.ts` | Created | `AlignmentOp`, `DivergenceSpan` |
| `src/lib/analysis/divergence/align.ts` | Created | Levenshtein word-alignment |
| `src/lib/analysis/divergence/detectDivergence.ts` | Created | Divergence-span detection |
| `src/lib/analysis/divergence/index.ts` | Created | Barrel export |
| `src/lib/analysis/divergence/align.test.ts` | Created | 6 alignment unit tests |
| `src/lib/analysis/divergence/detectDivergence.test.ts` | Created | 5 divergence-detection unit tests |
| `src/lib/pipeline/runVerbatim.ts` | Created | Parallel kickoff + verbatim persistence helper |
| `src/lib/pipeline/runVerbatim.test.ts` | Created | 5 integration tests |
| `src/lib/pipeline/executePipeline.ts` | Modified | Verbatim step wired in parallel with Whisper |
| `src/lib/pipeline/executePipeline.test.ts` | Modified | Mocked new verbatim step |
| `prisma/schema.prisma` | Modified | 4 nullable fields on `SpeakingSession` |
| `prisma/migrations/20260603215734_add_verbatim_asr_fields/migration.sql` | Created | Additive migration |
| `package.json` | Modified | `0.65.0` → `0.66.0` |

---

## Architecture Decisions

| Decision | Why |
|----------|-----|
| Second provider rather than Whisper post-processing | Whisper deliberately normalises speech; you need a separate verbatim-preserving pass to recover disfluency signal |
| Parallel execution, best-effort failure | Zero added latency; pipeline remains fully functional without the new API key; verbatim data accumulates gradually |
| Levenshtein word alignment | Deterministic, zero-cost, no inference step; word-edit distance is sufficient to localise disfluency spans against a normalised reference |
| 4 nullable columns on `SpeakingSession` (no new table) | Data is always session-scoped and read together; avoids a join; nullable columns are non-breaking for existing rows |
| `verbatimProvider` stored per session | Forward-compatibility — a future provider swap requires no schema change |

---

## Testing Checklist

- [x] `npm run typecheck` — zero errors
- [x] `npm run lint` — zero warnings
- [x] `npm run test:coverage` — 178 files, 1435 passed, 4 skipped, 0 failures (23 new tests); global coverage 71% stmts / 84% branch / 94% funcs / 71% lines, all thresholds met
- [x] Pipeline runs correctly when `ASSEMBLYAI_API_KEY` is absent (best-effort skip)
- [x] Pipeline runs correctly when AssemblyAI call succeeds (verbatim + divergence spans stored)
- [x] Pipeline runs correctly when AssemblyAI call fails mid-flight (error swallowed, Whisper result preserved)
- [x] Divergence spans round-trip cleanly through the `Json` Prisma field
- [x] Alignment algorithm handles edge cases: empty transcripts, identical transcripts, fully diverged pairs

---

## Deployment Notes

**New environment variable:**
- `ASSEMBLYAI_API_KEY` — optional; enables verbatim transcription. Already set in Vercel (production) and `.env.local` (local). If absent, verbatim fields remain `null` and the pipeline continues normally.

**Database migration:**
- A new Prisma migration (`20260603215734_add_verbatim_asr_fields`) adds 4 nullable columns to `speaking_sessions`. Apply it on deploy:

```bash
npx prisma migrate deploy
```

⚠️ **Pre-existing migration drift:** The migration `20260603164752_fix_lexeme_pos_nullable` is recorded in the codebase but has not been applied to the live database, causing migration-history drift. `prisma migrate deploy` may report a conflict or fail until this drift is resolved. Resolve the drift first (either apply the missing migration manually or reset migration history to match the DB state), then deploy both pending migrations together.

---

## Validation Output

```
npm run typecheck   ✅  clean, zero errors
npm run lint        ✅  clean, zero warnings
npx vitest run      ✅  177 test files, 1433 passed, 4 skipped, 0 failures
```
