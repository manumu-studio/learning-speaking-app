# PR-0.42.0 — Onboarding Flow + Session History
**Branch:** `feat/onboarding-history` → `main`
**Version:** `0.42.0`
**Date:** 2026-05-27
**Status:** ✅ Ready to merge
---
## Summary
New users complete a placement recording before accessing the app; returning users get a paginated activity feed with date filters and richer session rows.

## Files Changed
| File | Action | Notes |
|------|--------|-------|
| `prisma/migrations/20260527221350_add_onboarding_fields/` | Created | User + session fields |
| `src/features/onboarding/**` | Created | Full onboarding UI |
| `src/app/api/users/me/route.ts` | Created | PATCH onboardedAt |
| `src/app/api/sessions/route.ts` | Modified | Cursor list + isOnboarding POST |
| `src/features/session/useSessionHistory*` | Modified | Infinite scroll hook |
| `src/app/(app)/history/page.tsx` | Modified | Filter bar + sentinel |
| `src/components/ui/HistorySessionCard/` | Modified | Workout + score chips |
| `src/app/(app)/layout.tsx` | Modified | Redirect guard |

## Architecture Decisions
| Decision | Why |
|----------|-----|
| Cursor pagination | Stable feed under concurrent new sessions |
| Server layout redirect | Uses existing `syncUser`; middleware forwards pathname |
| Exclude `isOnboarding` from dashboard | Placement test must not skew trends |
| Native IntersectionObserver | No extra dependency for load-more |

## Testing Checklist
- [ ] New user (`onboardedAt` null) redirects to `/onboarding`
- [ ] 30–60s recording uploads with `isOnboarding=true`
- [ ] Voice profile shows after processing; Start training sets focus + onboardedAt
- [ ] Dashboard metrics omit placement session
- [ ] History filters (7d/30d/all) and infinite scroll load next page
- [ ] Onboarding session absent from history list

## Deployment Notes
- Run migration: `npx prisma migrate deploy`
- No new env vars

## Validation
```
npx tsc --noEmit → exit 0
npm run build → ✓ Compiled successfully
npm run lint → ✔ No ESLint warnings or errors
npx vitest run sessions dashboard history onboarding → 70 passed
```
