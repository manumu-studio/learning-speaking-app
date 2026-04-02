# PR-0.21.0 — Pipeline refactor, CI tests, App Router errors
**Branch:** `feature/pipeline-refactor` → `main`
**Version:** `0.21.0`
**Date:** 2026-04-01
**Status:** ✅ Ready to merge
---
## Summary
This release removes duplicated processing logic between production and development pipeline entry points, runs automated tests in CI, surfaces segment-level error pages for users, and improves observability for the focus comparison endpoint.

## Files Changed
| File | Action | Notes |
|------|--------|-------|
| `src/lib/pipeline/executePipeline.ts` | Added | Single pipeline implementation |
| `src/app/api/internal/process/route.ts` | Changed | Thin QStash wrapper |
| `src/app/api/dev/process/route.ts` | Changed | Thin dev wrapper |
| `.github/workflows/ci.yml` | Changed | `npm run test`; job title update |
| `src/app/(app)/error.tsx` | Added | Error UI + dashboard link |
| `src/app/(public)/error.tsx` | Added | Error UI + home link |
| `src/app/api/sessions/[id]/focus-comparison/route.ts` | Changed | Error logging in catch |
| `package.json` | Changed | Version **0.21.0** |

## Architecture Decisions
| Decision | Why |
|----------|-----|
| Shared `executePipeline` with a mode flag | One place to fix bugs and evolve the 15-step flow |
| Typed HTTP errors from the pipeline | Distinguish validation responses from hard failures and QStash retry semantics |
| `error.tsx` per route group | Matches App Router contracts; keeps marketing vs app navigation distinct |

## Testing Checklist
- [x] `npx tsc --noEmit`
- [x] `npm run lint`
- [x] `npm run test`
- [x] `npm run build`
- [ ] Manual: trigger a render error under `(app)` and `(public)` and confirm reset / navigation
- [ ] Manual: dev process and QStash flows in staging (if available)

## Deployment Notes
No database migrations. CI will run tests on future PRs; ensure GitHub Actions remains allowed for the repository.

## Validation
```bash
npx tsc --noEmit   # pass
npm run lint       # ✔ No ESLint warnings or errors
npm run test       # 7 tests passed
npm run build      # ✓ Compiled successfully
```
Run on 2026-04-01 on `feature/pipeline-refactor`.
