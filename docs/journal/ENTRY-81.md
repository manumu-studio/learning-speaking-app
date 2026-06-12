# ENTRY-81 — 2026-06-12 — Architecture Boundary Cleanup

**Type:** Refactor
**Branch:** refactor/architecture-boundaries-audit
**Version:** 0.72.2

## Summary

Eliminated eleven dependency inversions where `src/lib/` imported from `src/features/`.
The lib layer is now self-contained: it has no upward dependencies on the feature layer.
No behavior changes, no public API changes — every move is backed by a backward-compatible
re-export so existing consumers are untouched.

## What changed

- Created `src/lib/metrics/metrics.types.ts` — canonical home for `MetricKey`, `MetricLevel`, `PronunciationMetricKey`, and `PRONUNCIATION_METRIC_KEYS`. Previously defined in `features/dashboard/dashboard.types.ts`.
- Created `src/lib/metrics/pillars.ts` — canonical home for `PillarKey`, `PillarConfig`, `PILLAR_CONFIG`, `PILLAR_KEYS`, and `METRIC_LABELS`. Previously defined in `features/dashboard/pillars.ts`.
- Created `src/lib/metrics/index.ts` — barrel export for the metrics module.
- Moved `updatePatternProfile` from `features/session/` to `lib/pipeline/`. The original file is now a one-line re-export shim.
- Removed the hard `auth` import from `lib/observability/withObservability.ts`. Auth is now injected via an optional `getSession` callback in `ObservabilityOptions`; route handlers pass `getSession: auth` so Sentry user context is unchanged.
- Updated backward-compat re-exports in `features/dashboard/dashboard.types.ts` and `features/dashboard/pillars.ts` so all existing feature consumers require no changes.

## Files touched

| File | Action | Notes |
|------|--------|-------|
| `src/lib/metrics/metrics.types.ts` | Created | Metric key + level types |
| `src/lib/metrics/pillars.ts` | Created | Pillar config + label constants |
| `src/lib/metrics/index.ts` | Created | Barrel export |
| `src/lib/pipeline/updatePatternProfile.ts` | Created | Moved from features |
| `src/lib/observability/withObservability.ts` | Modified | `auth` import removed, `getSession` option added |
| `src/features/dashboard/dashboard.types.ts` | Modified | Re-exports metric types from lib |
| `src/features/dashboard/pillars.ts` | Modified | Re-exports pillar constants from lib |
| `src/features/session/updatePatternProfile.ts` | Modified | Replaced with re-export shim |
| `src/lib/personalRecords.types.ts`, `src/lib/personalRecords.ts`, `src/lib/cefr/cefr.types.ts`, `src/lib/cefr/estimateCefr.ts`, `src/lib/daily/aggregateDayData.ts`, `src/lib/daily/dayDetail/buildDaySummaryNarrative.ts`, `src/lib/daily/dayDetail/buildDayEvidenceBundle.ts` | Modified | Import paths corrected to `lib/metrics` |
| `src/lib/pipeline/persistSynthesisResults.ts`, `src/lib/pipeline/processFinal.ts`, `src/lib/pipeline/executePipeline.ts` | Modified | Import paths corrected to `lib/pipeline/updatePatternProfile` |
| API route handlers (42 files under `src/app/api/`) | Modified | Pass `getSession: auth` to `withObservability` |
| `src/lib/pipeline/__tests__/processFinal.test.ts`, `src/lib/pipeline/executePipeline.test.ts` | Modified | Mock path follows the moved `updatePatternProfile` module |
| `package.json`, `CHANGELOG.md` | Modified | Version bump + changelog |

## Decisions

- **Re-export shims over consumer rewrites.** Moving a symbol and leaving a re-export at the old path keeps every external consumer compiling unchanged. The move is invisible outside `lib/`.
- **Dependency injection over relocating `auth`.** `auth` depends on Next.js `cookies()` — it is a route-layer concern and does not belong in `lib`. Injecting an optional `getSession` callback keeps the observability wrapper generic and unit-testable without mocking the auth subsystem.
- **`MetricScore` stayed in features.** No `lib/` module imports it, so moving it would put a type in lib that lib never uses. It moves only when a lib consumer needs it.

## Still open

- None. `grep "from '@/features" src/lib` returns zero results.

## Validation

```bash
npm run typecheck   # 0 errors
npm run lint        # 0 warnings
npm test -- --run   # 1607 passed, 4 skipped
npm run build       # success
grep -rn "from '@/features" src/lib --include='*.ts' | grep -v '\.test\.' | grep -v '\.spec\.'   # (empty)
```

## Rationale

Keeping `lib/` free of upward dependencies means:
1. Pipeline workers and utilities can be unit-tested without loading the feature layer.
2. Circular import risks are structurally eliminated.
3. The dependency graph becomes easier to reason about: features always depend on lib, never the reverse.
