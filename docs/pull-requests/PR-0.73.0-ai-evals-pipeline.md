# PR-0.73.0 — AI Evals Pipeline (Foundation + Offline Accuracy Harness)

**Branch:** `feat/ai-evals-pipeline` → `main`
**Version:** 0.73.0
**Type:** Feature
**Status:** ✅ Ready to merge

## Summary

The scoring pipeline judges seven language metrics with an LLM and previously had no way to
measure whether those judgments are correct. This PR adds the foundation and the first working
offline eval: re-run the judge on a frozen set of human-labelled sessions and report per-metric
agreement against a human rater (MAE, within-1%, Spearman, banded QWK, bootstrap 95% CI) beside
the intra-rater ceiling. It ships local commands and a developer report view; CI gating and a
longitudinal dashboard are a follow-up.

## What Was Built

### Re-runnable judge + cache correctness (`src/lib/ai/analyze.ts`, `analysisCache.ts`)
- `analyzeTranscript({ skipCache: true })` bypasses the Redis read and write so a re-run after a
  prompt edit returns a fresh score. Omitting the flag is byte-for-byte identical to before.
- The cache key now folds in a hash of the assembled prompt plus the model pin. A shipped prompt
  or model change no longer serves a stale score for the 7-day TTL (a latent production bug).
  Graceful full miss on deploy — old keys simply repopulate.

### Eval data model (`prisma/schema.prisma`, migration `20260613035040_add_eval_golden_models`)
- `GoldenSession` (frozen, denormalized snapshot), `GoldenLabel` (human scores, with `isRetest`
  for the intra-rater ceiling), `JudgeRun` (one AI score per metric per model+prompt). No hard
  FK to the live session, so golden rows survive source-session deletion.
- `src/lib/eval/golden.types.ts` — shared types and a Zod schema for stored Azure payloads.

### Snapshot, rubric, and labelling tools
- `scripts/eval/snapshot-session.ts` — freezes chosen sessions into golden rows, rebuilding the
  pronunciation summary the judge originally saw via a shared `buildPronunciationSummaryFromRows`
  helper.
- `docs/eval/RUBRICS-v1.md` — anchored 1–10 descriptors for all 7 metrics, versioned by
  `src/lib/eval/rubricVersion.ts`.
- `scripts/eval/label.ts` — interactive CLI for the single rater to score the 7 metrics, with a
  blind re-test mode.

### Run + grade
- `eval/judgeProvider.ts` + `eval/promptfooconfig.yaml` — a Promptfoo custom provider wraps the
  judge (`skipCache: true`) and persists `JudgeRun` rows. `scripts/eval/export-testcases.ts`
  exports golden items to the runner. `npm run eval:run`.
- `src/lib/eval/stats.ts` — per-metric MAE, within-1, Spearman, banded QWK (returns `null`, never
  `NaN`, on empty bands), bootstrap 95% CIs (≥1000 resamples, seeded for determinism), and the
  intra-rater MAE ceiling. `npm run eval:report` prints a table and writes `eval/REPORT-latest.json`.

### Report view (`src/app/(app)/dev/evals/page.tsx`, `src/features/eval/EvalReportTable/`)
- Read-only developer view. Zod-validates the report JSON at the file boundary, renders a
  per-metric table, and flags rows where MAE exceeds the intra-rater ceiling. Shows an
  empty-state when no report has been generated.

### Deterministic regression tests
- New snapshot/tolerance blocks lock the filler density-to-score table, the WPM-to-score bands,
  and the Azure-to-1-10 curve at every boundary (`countVerbatimFillers.test.ts`,
  `persistPronunciation.test.ts`).

## Architecture Decisions

| Decision | Why |
|---|---|
| Promptfoo runs, Vitest grades | A real eval runner is a stronger signal than a hand-rolled loop; the statistics aren't first-class in the runner, so they live in a tested module. No overlap. |
| Human label is the only ground truth | Model judges are regression checks, never truth. One rater is not inter-rater reliability — nothing is described as "validated". |
| No bare agreement number | Every statistic is reported with its CI and the intra-rater ceiling beside it; banded QWK guards empty bands. |
| Frozen, denormalized golden set | Replayable from stored text even if the source session is later deleted; no FK to live rows. |
| Offline, not yet in CI | Avoids API cost on every run and keeps results reproducible. CI gating is a follow-up. |

## How to Verify

1. `npm run typecheck` — no type errors
2. `npm run lint` — clean
3. `npm run test` — all pass (includes the new stats + snapshot tests)
4. `npm run dev` → visit `/dev/evals` — shows the empty-state ("no report found") until a report is generated
5. After deploy, the golden set is populated and labelled, then `npm run eval:run` produces `JudgeRun` rows and `npm run eval:report` writes `eval/REPORT-latest.json`; reload `/dev/evals` to see the per-metric table with the honesty caveat and any red-flagged rows

## Deployment Notes

- Apply the new migration on deploy: `npx prisma migrate deploy` (additive — three new tables, no changes to existing tables).
- The cache-key change is a graceful full cache miss on first call after deploy; the first batch of sessions pays the un-cached analysis cost once. Expected and acceptable.
- Populating + labelling the golden set is a manual rater step (deferred); the harness is ready to run once the set exists.
