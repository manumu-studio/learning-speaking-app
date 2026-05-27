# ENTRY-45 — Personal Records + Gym Motivation
**Date:** 2026-05-27
**Type:** Feature
**Branch:** `feat/personal-records`
**Version:** `0.41.0`
---
## What I Did
- Added Personal Records detection comparing session scores against 14-day, 30-day, and all-time bests
- Built gold PR ribbons on session results and a scrollable Personal Bests strip on the dashboard
- Introduced workout numbering ("Workout #47") and Workout Weeks (weeks with ≥3 workouts) replacing streak guilt
- Audited UI copy from clinical language to gym-coach tone across components and features

## Files Touched
| File | Action | Notes |
|------|--------|-------|
| `src/lib/personalRecords.ts` | Created | PR detection with groupBy |
| `src/app/api/sessions/[id]/personal-records/route.ts` | Created | On-demand PR endpoint |
| `src/components/ui/PersonalRecordBanner/` | Created | Session gold ribbons |
| `src/features/dashboard/PersonalRecordStrip/` | Created | Dashboard trophy shelf |
| `src/features/dashboard/getDashboardData.ts` | Modified | Workout weeks + all-time PRs |
| `src/components/ui/SessionHeader/` | Modified | Workout #N header |
| `src/app/(app)/session/[id]/page.tsx` | Modified | Banner + workout framing |
| `src/lib/personalRecords.test.ts` | Created | PR logic tests |

## Decisions
- PR detection is request-time, not pipeline-embedded — avoids reprocessing dependency
- Strict `>` comparison for PR qualification; first score counts as PR with null previousBest
- Workout Weeks uses ISO week grouping with ≥3 threshold — positive-only, never resets
- Copy changes limited to display strings; API paths and type names unchanged

## Still Open
- Workout weeks uses the same 100-session window as streak data; users with >100 sessions may undercount older weeks

## Validation
```
npm test → 445 passed | 4 skipped
npx tsc --noEmit → exit 0
npm run lint → ✔ No ESLint warnings or errors
npm run build → ✓ Compiled successfully
```
