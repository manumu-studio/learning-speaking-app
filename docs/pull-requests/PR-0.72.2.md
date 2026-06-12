# PR-0.72.2 — Architecture Boundary Cleanup

**Branch:** refactor/architecture-boundaries-audit → main
**Version:** 0.72.2
**Type:** Refactor — no behavior changes

## Summary

Corrected eleven dependency inversions where `src/lib/` imported from `src/features/`. The
`lib/` layer is the foundation of the app (pipeline workers, data access, CEFR, personal
records) and must never depend on the feature layer. After this change the dependency graph
is one-way: features depend on lib, never the reverse.

## What was built

### New lib/metrics module
- `src/lib/metrics/metrics.types.ts` — `MetricKey`, `MetricLevel`, `PronunciationMetricKey`, `PRONUNCIATION_METRIC_KEYS`
- `src/lib/metrics/pillars.ts` — `PillarKey`, `PillarConfig`, `PILLAR_CONFIG`, `PILLAR_KEYS`, `METRIC_LABELS`
- `src/lib/metrics/index.ts` — barrel export

### Moved updatePatternProfile
- `src/lib/pipeline/updatePatternProfile.ts` — canonical location, alongside the pipeline code that calls it
- `src/features/session/updatePatternProfile.ts` — now a one-line re-export shim

### Decoupled withObservability from auth
- `ObservabilityOptions.getSession` — optional callback injected from call sites
- 42 API route handlers pass `getSession: auth` so Sentry user context is identical to before
- Internal/cron/public routes (no auth import) omit it — they had no user session to enrich

### Updated feature re-exports
- `features/dashboard/dashboard.types.ts` re-exports metric types from lib
- `features/dashboard/pillars.ts` re-exports pillar constants from lib

## Files Changed

| Area | Action |
|------|--------|
| `src/lib/metrics/*` (3 files) | Created — metric types, pillar constants, barrel |
| `src/lib/pipeline/updatePatternProfile.ts` | Created — moved from features |
| `src/lib/observability/withObservability.ts` | `auth` import removed, `getSession` option added |
| `src/features/dashboard/dashboard.types.ts`, `src/features/dashboard/pillars.ts` | Re-export from lib |
| `src/features/session/updatePatternProfile.ts` | Re-export shim |
| 10 lib consumers | Import paths corrected to the new lib modules |
| 42 API route handlers | Inject `getSession: auth` into `withObservability` |
| 2 pipeline test files | Mock path follows the moved module |
| `package.json`, `CHANGELOG.md` | Version bump + changelog |

## How to verify

```bash
# Zero inversions
grep -rn "from '@/features" src/lib --include='*.ts' | grep -v '\.test\.' | grep -v '\.spec\.'
# (empty output)

# Full quality gates
npm run typecheck && npm run build && npm run lint && npm test -- --run
```

## Testing Checklist

- [x] `npm run typecheck` — 0 errors
- [x] `npm run lint` — 0 warnings
- [x] `npm test -- --run` — 1607 passed, 4 skipped
- [x] `npm run build` — success
- [x] Zero-inversion grep returns no lines

## Backward compatibility

All public APIs are unchanged. Existing consumers that import from `features/dashboard/dashboard.types`
or `features/dashboard/pillars` continue to work via re-exports. The old
`features/session/updatePatternProfile` path still resolves through a shim. No migrations, no
DB changes, no environment changes.

## Deployment Notes

Pure refactor — safe to deploy with no special steps. No new environment variables, no schema
changes.
