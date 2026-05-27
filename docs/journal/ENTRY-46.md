# ENTRY-46 — Onboarding Flow + Session History
**Date:** 2026-05-27
**Type:** Feature
**Branch:** `feat/onboarding-history`
**Version:** `0.42.0`
---
## What I Did
- Added first-run onboarding: welcome prompt, 30–60s placement recording, voice profile results, and server-side `onboardedAt` guard
- Extended sessions API with cursor pagination, date filters, workout numbers, and score fields for the activity feed
- Rebuilt history page with filter tabs, infinite scroll via IntersectionObserver, and richer session cards (workout #, word count, ScoreChip, pronunciation tier)

## Files Touched
| File | Action | Notes |
|------|--------|-------|
| `prisma/schema.prisma` | Modified | `onboardedAt`, `isOnboarding` |
| `src/app/api/sessions/route.ts` | Modified | Cursor GET + onboarding POST flag |
| `src/app/api/users/me/route.ts` | Created | Mark onboarding complete |
| `src/features/onboarding/**` | Created | Welcome, recorder, voice profile, flow |
| `src/app/(app)/onboarding/` | Created | Page + loading |
| `src/features/session/useSessionHistory*` | Modified | Cursor pagination hook |
| `src/components/ui/HistorySessionCard/` | Modified | Workout badge, scores |
| `src/app/(app)/history/page.tsx` | Modified | Filters + sentinel |
| `src/features/dashboard/getDashboardData.ts` | Modified | Exclude onboarding from metrics |

## Decisions
- Placement session uses real pipeline end-to-end so first dashboard view reflects actual scores
- Focus after onboarding writes to existing `lsa-focus` key so FocusSelector works without dashboard changes
- History excludes onboarding via `?isOnboarding=false` query param
- Pronunciation tier badge scales 0–10 metric score ×10 for Azure-tier component thresholds

## Still Open
- End-to-end onboarding UAT on device (mic permissions, processing wait) pending manual QA

## Validation
```
npx tsc --noEmit → exit 0
npm run build → ✓ Compiled successfully
npm run lint → ✔ No ESLint warnings or errors
npx vitest run sessions dashboard history onboarding → 70 passed
```
