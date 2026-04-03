# PR-0.27.0 — Test coverage hardening and security polish

**Branch:** `feature/test-coverage-hardening` → `main`
**Version:** `0.27.0`
**Date:** 2026-04-03
**Status:** Ready to merge

---

## Summary

This release pushes unit test coverage over the 70% statement/line bar for configured source paths, adds CSP and companion security headers in middleware, introduces route-group error and loading UI, optimizes a few hot database reads, and tightens CI so unit tests run explicitly before the coverage job. Dependabot configuration matches the previous grouped weekly schedule, and Node 20 is pinned for contributors and tooling.

## Files Changed

| Area | Notes |
|------|--------|
| Tests under `src/` | Hooks, training and shared UI, `lib`, pipeline route failure |
| `vitest.config.ts` | Coverage thresholds |
| `src/middleware.ts` | CSP, XFO, referrer, permissions |
| `src/app/(app)/*`, `(public)/*` | `error.tsx`, `loading.tsx` |
| `getDashboardData`, `db-utils` | Bounded streak query; lean session list |
| `src/lib/pipeline/*` | Shared failure persistence; barrel exports |
| API `process` routes | Delegate failure handling to shared helpers |
| `.github/workflows/ci.yml` | `npm run test` then `test:coverage` |
| `.github/dependabot.yml` | npm groups + Actions + ignores |
| `package.json`, `.nvmrc` | Version and engines |

## Architecture Decisions

| Decision | Why |
|----------|-----|
| Security headers on broad matcher | Protects pages and APIs consistently while rate limiting stays on non-auth API paths |
| Shared `pipelineRouteFailure` | One place for FAILED status writes and QStash final-attempt rules |
| CI: test then coverage | Satisfies “dedicated unit test step” without dropping threshold enforcement |

## Testing Checklist

- [x] `npx tsc --noEmit`
- [x] `npm run lint`
- [x] `npm run test`
- [x] `npm run test:coverage`
- [ ] `npm run build` (confirm on Node 20 or CI)
- [ ] `npm run test:e2e` (CI E2E job)

## Deployment Notes

- No migration changes. Ensure production environment variables for QStash and auth remain set; CSP `connect-src` includes the configured auth host.

## Validation

- `npx tsc --noEmit` — pass  
- `npm run lint` — pass  
- `npm run test` — pass  
- `npm run test:coverage` — pass (thresholds met)
