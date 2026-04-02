# ENTRY-21 — Pipeline refactor, CI tests, App Router error surfaces
**Date:** 2026-04-01
**Type:** Infrastructure
**Branch:** `feature/pipeline-refactor`
**Version:** `0.21.0`
---
## What I Did
- Consolidated production and development processing behind a single `executePipeline` implementation so the 15-step flow lives in one module.
- Left the internal and dev API routes as thin wrappers that call the shared pipeline with the appropriate mode.
- Turned on `npm run test` in CI so pull requests run the Vitest suite automatically.
- Added segment-level `error.tsx` files for the authenticated app shell and the public marketing routes so render failures show a recoverable UI with sensible navigation.
- Improved error logging on the focus-comparison API route for easier diagnosis when comparisons fail.

## Files Touched (table: File | Action | Notes)
| File | Action | Notes |
|------|--------|-------|
| `src/lib/pipeline/executePipeline.ts` | Added | Shared pipeline |
| `src/app/api/internal/process/route.ts` | Updated | QStash entry |
| `src/app/api/dev/process/route.ts` | Updated | Dev entry |
| `.github/workflows/ci.yml` | Updated | Test step |
| `src/app/(app)/error.tsx` | Added | App segment errors |
| `src/app/(public)/error.tsx` | Added | Public segment errors |
| `src/app/api/sessions/[id]/focus-comparison/route.ts` | Updated | Logging in catch |
| `package.json` | Updated | Version `0.21.0` |

## Decisions (rationale bullets)
- Typed HTTP-style results from the pipeline keep retry behaviour clear for QStash versus user-facing validation errors.
- Separate `error.tsx` per route group matches Next.js App Router expectations and keeps home vs dashboard links appropriate.

## Still Open (known gaps)
- Manual checks for deliberate render errors under `(app)` and `(public)` remain useful before release.

## Validation (commands + results)
- `npx tsc --noEmit`, `npm run lint`, `npm run test`, `npm run build` — all succeeded on 2026-04-01 on `feature/pipeline-refactor`.
