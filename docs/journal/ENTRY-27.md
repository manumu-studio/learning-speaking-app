# ENTRY-27 — Test coverage hardening and security polish

**Date:** 2026-04-03
**Type:** Infrastructure
**Branch:** `feature/test-coverage-hardening`
**Version:** `0.27.0`

---

## What I Did

Raised automated test coverage toward production-grade thresholds (70% statements/lines) with new Vitest suites for drill and session hooks, training and shared UI components, and core library helpers. Hardened the edge layer with a Content Security Policy and related security headers in middleware (alongside existing API rate limiting), added App Router error and loading boundaries for both authenticated and public segments, and tightened dashboard streak querying plus a leaner session list projection in database utilities. CI now runs a dedicated unit-test step before the coverage-gated run; Dependabot again groups minor/patch npm updates, pins the weekly run to Monday, bumps GitHub Actions, and ignores major `next-auth` jumps. Pipeline process routes share explicit failure-persistence helpers next to `executePipeline`. Documented Node 20 via `.nvmrc` and `package.json` engines.

## Files Touched

| File | Action | Notes |
|------|--------|-------|
| `src/**/*.test.ts`, `src/**/*.test.tsx` | Added | Hooks, components, lib, pipeline |
| `vitest.config.ts` | Modified | Thresholds 70/60/70/70 |
| `package.json` | Modified | Version 0.27.0, `engines.node` |
| `.nvmrc` | Added | Node 20 |
| `src/middleware.ts` | Modified | CSP + security headers |
| `src/app/(app)/error.tsx`, `loading.tsx` | Added | Protected routes |
| `src/app/(public)/error.tsx`, `loading.tsx` | Added | Public routes |
| `src/features/dashboard/getDashboardData.ts` | Modified | Streak query `take: 100` |
| `src/lib/db-utils.ts` | Modified | `getUserSessions` select + counts |
| `src/lib/pipeline/pipelineRouteFailure.ts` | Added | Shared FAILED persistence + QStash final attempt |
| `src/app/api/internal/process/route.ts`, `dev/process/route.ts` | Modified | Use shared failure helpers |
| `.github/workflows/ci.yml` | Modified | Explicit `npm run test` before coverage |
| `.github/dependabot.yml` | Modified | Restored groups, Monday, actions, ignore |

## Decisions

- **Two test steps in CI** — Fast `npm run test` gives a clear signal; `test:coverage` still enforces Vitest floors.
- **Route-level pipeline helpers** — `executePipeline` stays the orchestration core; duplicated “mark session FAILED” logic moved to one module so internal (QStash retries) and dev routes stay thin.
- **Dependabot parity with prior main** — Avoids noisy major bumps on `next-auth` while keeping weekly Actions refresh.

## Still Open

- Very large or canvas-heavy components remain thinly tested; thresholds are met on included paths, not the whole UI surface.
- Local builds need Node 20 (see `.nvmrc`) for Tailwind Oxide and engine alignment.

## Validation

- `npx tsc --noEmit` — pass
- `npm run lint` — pass
- `npm run test` — pass
- `npm run test:coverage` — pass (thresholds 70/60/70/70)
