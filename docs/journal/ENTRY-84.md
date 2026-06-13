# ENTRY-84 — 2026-06-13

**Type:** Feature / Evals
**Version:** 0.73.0
**Branch:** feat/ai-evals-pipeline

## Summary

The scoring pipeline judges seven language metrics with an LLM but had no way to measure
whether those judgments are correct — every prompt change and model swap shipped blind. This
release adds the foundation and the first working offline accuracy harness: re-run the judge
on a frozen set of human-labelled sessions and report per-metric agreement against a human
rater. It delivers local commands that produce a per-metric accuracy table and a developer
report view at `/dev/evals`.

The seven judged metrics are connectorRepetition, structuralVariety, vocabularyPrecision,
verbAccuracy, argumentClosure, lexicalSophistication, and registerPragmatics. Deterministic
metrics (filler usage, speaking rate) and the Azure pass-through metrics (pronunciation
accuracy, prosody) are covered by snapshot/tolerance tests instead — a wrong number there is
a bug, not drift.

## What Changed

- **Re-runnable judge** — `analyzeTranscript` gained a `skipCache` option that bypasses the
  Redis read and write so a re-run after a prompt edit produces a fresh score instead of the
  cached one.
- **Cache correctness fix** — the analysis cache key now folds in a hash of the assembled
  prompt plus the model pin, so a shipped prompt or model change no longer serves a stale
  score for the 7-day TTL. Graceful full miss on deploy.
- **Frozen golden set** — three new models (`GoldenSession`, `GoldenLabel`, `JudgeRun`) store a
  denormalized snapshot of exactly what the judge needs to replay (clean + verbatim transcript,
  rebuilt pronunciation summary), so the set survives the source session changing or being
  deleted. Migration `20260613035040_add_eval_golden_models`.
- **Snapshot + labelling tools** — `scripts/eval/snapshot-session.ts` freezes chosen sessions
  into golden rows; `scripts/eval/label.ts` is an interactive CLI for the human rater to score
  the 7 metrics (with a blind re-test mode for the intra-rater ceiling). Anchored 1–10 rubrics
  live in `docs/eval/RUBRICS-v1.md`, versioned via `src/lib/eval/rubricVersion.ts`.
- **Run + grade** — the judge is driven through a Promptfoo custom provider
  (`eval/judgeProvider.ts`), persisting `JudgeRun` rows (`npm run eval:run`). A Vitest-grade
  stats module (`src/lib/eval/stats.ts`) computes MAE, within-1 accuracy, Spearman rho, banded
  QWK, and bootstrap 95% CIs per metric, plus the intra-rater MAE ceiling; `npm run eval:report`
  prints a per-metric table and writes `eval/REPORT-latest.json`.
- **Report view** — `/dev/evals` renders the latest report and flags any metric whose MAE
  exceeds the intra-rater ceiling (the honest "this metric is unreliable" signal), with a
  caveat about N and single-rater limitations.
- **Regression tests** — snapshot/tolerance blocks lock the filler density-to-score table, the
  WPM-to-score bands, and the Azure-to-1-10 curve at every boundary.
- `package.json` 0.72.4 → 0.73.0; `CHANGELOG.md` new [0.73.0] entry.

## Key Decisions

- **Promptfoo runs, Vitest grades.** A real eval runner drives the judge and caches by
  (inputs + prompt + model); the agreement statistics — which are not first-class in the runner
  — live in a tested Vitest module. The two tools do not overlap.
- **The only ground truth is the human label.** Model judges are not treated as truth. With a
  single rater and small N the numbers are directionally useful, not publication-grade: no
  agreement number is reported without its confidence interval and the intra-rater ceiling
  beside it, and nothing is described as "validated" or inter-rater reliable.
- **Banded QWK, guarded.** QWK collapses the 1–10 scale into bands and returns `null` (never
  `NaN`) when a band is empty; MAE and within-1 are the headline numbers.
- **Frozen, denormalized golden set.** Golden rows do not hold a foreign key to the live
  session, so they remain replayable from stored text even if the source session is later
  deleted.

## Still Open

- Populating and labelling the golden set is a manual rater step and is intentionally deferred;
  the harness ships ready to run once the set exists. The new migration is applied at deploy
  (`prisma migrate deploy`).
- CI gating, cross-run stability, a cross-family judge, and a longitudinal dashboard are a
  follow-up release.

## Validation

- `npm run typecheck` — clean
- `npm run lint` — clean
- `npm run test` — 1693 passing, 4 skipped (includes the new stats and snapshot tests)
