# PR-0.24.0 — CI/CD Pipeline Hardening

**Branch:** `feature/ci-cd-hardening` → `main`
**Version:** `0.24.0`
**Date:** 2026-04-03
**Status:** ✅ Ready to merge

---

## Summary

- CI pipeline now runs the full test suite, enforces a coverage floor (20% statements/lines, 40% branches/functions), audits npm dependencies for known vulnerabilities, and checks the shared JS bundle stays under 120 kB.
- Added `.nvmrc` (Node 20) to eliminate environment drift between local and CI.
- Added `error.tsx` for both route groups and `loading.tsx` skeletons for dashboard, history, and drills — closing the missing Next.js App Router surfaces.
- Added CSP and standard security headers via `next.config.ts`.
- Added Dependabot for automated weekly dependency updates (npm + GitHub Actions).

---

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `.github/workflows/ci.yml` | Modified | Test, coverage, npm audit, and bundle-budget steps |
| `.github/dependabot.yml` | Created | Weekly dependency updates for npm and Actions |
| `vitest.config.ts` | Modified | Coverage config: v8 provider, 20/40% thresholds |
| `package.json` | Modified | v0.24.0; `test:coverage` script; `@vitest/coverage-v8`, `@next/bundle-analyzer` |
| `next.config.ts` | Modified | CSP + security headers; bundle analyzer wrapper |
| `src/components/ui/ErrorBoundary/ErrorBoundary.types.ts` | Modified | `AppRouterErrorProps` interface |
| `src/app/(app)/error.tsx` | Created | Error boundary — authenticated routes |
| `src/app/(public)/error.tsx` | Created | Error boundary — public routes |
| `src/app/(app)/dashboard/loading.tsx` | Created | Dashboard loading skeleton |
| `src/app/(app)/history/loading.tsx` | Created | History loading skeleton |
| `src/app/(app)/drills/loading.tsx` | Created | Drills loading skeleton |
| `.nvmrc` | Created | Node 20 |

---

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| v8 coverage provider | Hooks into the V8 engine directly; no source transformation; better ESM + TypeScript + Vitest compatibility than Istanbul |
| 20/40% coverage thresholds | Statements/lines at 20% (honest floor); branches/functions at 40%. Ratchets up as PACKET-26/27 add tests |
| Headers in `next.config.ts` | Static policy, no request-level logic needed; avoids middleware overhead; co-located with Next.js config |
| Weekly Dependabot cadence | Frequent enough to catch security patches; avoids daily PR noise and developer fatigue |
| 120 kB bundle budget enforced in CI | Matches existing output (102 kB); prevents silent regression from future dependency additions |
| Node 20 via `.nvmrc` | Closes local/CI parity gap; required by v8 coverage provider; signals version to Vercel and contributors |

---

## Testing Checklist

- [ ] `npx tsc --noEmit` — zero errors
- [ ] `npm run lint` — zero violations
- [ ] `npm run test` — 35 tests pass (6 files)
- [ ] `npm run build` — clean build, shared JS under 120 kB
- [ ] Verify `error.tsx` renders correctly by triggering a runtime error in a dev environment
- [ ] Verify `loading.tsx` skeletons appear during simulated slow data fetch (add artificial delay or throttle network)
- [ ] Verify CSP headers are present in response headers (`X-Frame-Options`, `Content-Security-Policy`, etc.)
- [ ] Confirm CI passes end-to-end on the PR branch before merging

---

## Deployment Notes

- No database migrations in this change.
- No new environment variables required.
- `npm run test:coverage` requires Node 20 — use `nvm use` (`.nvmrc` present) if running locally on Node 18. The plain `npm run test` command works on both versions.
- After merge, monitor Dependabot PR flow to confirm weekly update cadence is working as expected.
- CSP `script-src` is strict. If future work adds third-party scripts (analytics, embeds), `next.config.ts` will need a targeted policy update.

---

## Validation

```text
npx tsc --noEmit   → 0 errors
npm run lint       → 0 violations
npm run test       → 35 passed (6 files)
npm run build      → clean; shared JS 102 kB (< 120 kB budget)
```
