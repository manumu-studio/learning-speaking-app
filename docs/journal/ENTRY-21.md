# ENTRY-21 — Pipeline refactor, CI tests, and App Router errors
**Date:** 2026-04-01
**Type:** Infrastructure
**Branch:** `feature/pipeline-refactor`
**Version:** `0.21.0`
---
## What I Did
- Extracted the shared upload-to-analysis pipeline into one module used by both the QStash webhook and the dev-only process endpoint, so behavior stays aligned and changes happen in one place.
- Extended CI to run the Vitest suite between lint and production build so regressions are caught on pull requests.
- Added route-level error UI for the authenticated shell and the public marketing shell, with try-again and safe navigation actions.
- Logged failures from the focus metric comparison API instead of swallowing errors silently.
- Bumped the app version to **0.21.0**.

## Files Touched
| File | Action | Notes |
|------|--------|-------|
| `src/lib/pipeline/executePipeline.ts` | Added | Shared pipeline; production vs dev branching for DB writes |
| `src/app/api/internal/process/route.ts` | Changed | QStash verify + `executePipeline('production')` |
| `src/app/api/dev/process/route.ts` | Changed | Dev guard + `executePipeline('dev')` |
| `.github/workflows/ci.yml` | Changed | Test step + clearer job name |
| `src/app/(app)/error.tsx` | Added | Authenticated segment error UI |
| `src/app/(public)/error.tsx` | Added | Public segment error UI |
| `src/app/api/sessions/[id]/focus-comparison/route.ts` | Changed | Structured error logging |
| `package.json` | Changed | `0.21.0` |

## Decisions
- Introduced a small HTTP error type for “expected” client/state problems (missing session, wrong status) so the webhook does not mark sessions FAILED when the handler returns 404/400.
- Used `Link` from Next.js for in-app navigation in error pages to meet lint rules and keep client navigation consistent.

## Still Open
- None specific to this slice; broader ESLint migration note remains for Next.js 16 (`next lint` deprecation).

## Validation
```bash
npx tsc --noEmit
npm run lint
npm run test
npm run build
```
All completed successfully on 2026-04-01.
