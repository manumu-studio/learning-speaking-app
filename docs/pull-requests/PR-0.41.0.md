# PR-0.41.0 — Personal Records + Gym Motivation
**Branch:** `feat/personal-records` → `main`
**Version:** `0.41.0`
**Date:** 2026-05-27
**Status:** ✅ Ready to merge
---
## Summary
Adds Personal Records detection with gold celebration ribbons, workout numbering, Workout Weeks consistency tracking, dashboard Personal Bests strip, and gym-coach copy tone across the UI.

## Files Changed
| File | Action | Notes |
|------|--------|-------|
| `src/lib/personalRecords.ts` | Created | Server-side PR detection |
| `src/app/api/sessions/[id]/personal-records/route.ts` | Created | GET PR data for session |
| `src/app/api/sessions/[id]/route.ts` | Modified | Returns workoutNumber |
| `src/components/ui/PersonalRecordBanner/` | Created | Session PR ribbons |
| `src/features/dashboard/PersonalRecordStrip/` | Created | Dashboard PR strip |
| `src/features/dashboard/getDashboardData.ts` | Modified | workoutWeeks + personalRecords |
| `src/features/dashboard/IdentitySummary/` | Modified | Workout Weeks stat |
| `src/components/ui/SessionHeader/` | Modified | Workout #N + focus areas |
| `src/app/(app)/session/[id]/page.tsx` | Modified | Banner integration |
| ~12 files | Modified | Copy tone audit |
| `src/lib/personalRecords.test.ts` | Created | PR unit tests |
| `package.json` | Modified | Version 0.41.0 |

## Architecture Decisions
| Decision | Why |
|----------|-----|
| On-demand PR API | Keeps pipeline lean; PRs recalculable without reprocessing |
| groupBy for window lookups | 3 queries total instead of N per metric |
| Workout Weeks over streak display | Non-punitive consistency metric that only grows |
| Display-only copy audit | Avoids regressions in API/types while shifting user tone |

## Testing Checklist
- [ ] Complete a workout that beats a prior score → gold PR banner appears
- [ ] Session header shows "Workout #N" for completed workouts
- [ ] Dashboard shows Personal Bests strip when all-time PRs exist
- [ ] IdentitySummary shows Workout Weeks (not Streak) when ≥1 qualifying week
- [ ] No "try again" / "needs work" / "issues" in user-facing component copy
- [x] `npx tsc --noEmit` — zero errors
- [x] `npm run lint` — zero warnings
- [x] `npm run test` — 445 passed
- [x] `npm run build` — clean build

## Deployment Notes
No migrations or new env vars. One new API route (`/api/sessions/[id]/personal-records`). Dashboard response shape extended with `workoutWeeks`, `personalRecords`, `totalWorkoutCount`.

## Validation
```
npm test → 445 passed | 4 skipped
npx tsc --noEmit → exit 0
npm run lint → ✔ No ESLint warnings or errors
npm run build → ✓ Compiled successfully
```
