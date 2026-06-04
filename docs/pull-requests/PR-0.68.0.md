# PR-0.68.0 — Daily Meta-Session Structure

**Branch:** `feat/daily-meta-session` → `main`
**Version:** 0.68.0
**Date:** 2026-06-04
**Status:** Ready for review

---

## Summary

Turns closed history days into a structured daily meta-session. The daily API now returns a user-scoped `dayDetail` payload for closed/past days, while today's sessions remain open before the 10pm local cutoff. The day detail view renders five sections: Sessions, Speech Quality, Pronunciation & Intonation, General Feedback, and Transcript.

Session results also now place the pronunciation map inside the transcript toggle, next to original and improved transcript modes.

## Files Changed

| File | Action | Notes |
|------|--------|-------|
| `src/lib/daily/dayDetail/*` | Created | Day detail schemas, pure section builders, server orchestrator, and builder tests |
| `src/app/api/daily/[date]/route.ts` | Modified | Adds closed-day guard and `dayDetail` response |
| `src/components/ui/HistoryDayGroup/HistoryDayGroup.tsx` | Modified | Keeps current-day sessions expanded before cutoff |
| `src/features/history/DayDetailContent/*` | Modified | Renders the five-section daily detail experience |
| `src/components/ui/TranscriptToggle/*` | Modified | Adds pronunciation map mode and word detail interaction |
| `src/app/(app)/session/[id]/SessionFeedbackSections.tsx` | Modified | Renames Speech Quality and removes standalone word map |
| `src/app/(app)/session/[id]/SessionDoneView.tsx` | Modified | Removes obsolete word map timing prop |
| `src/app/(app)/session/[id]/page.test.tsx` | Modified | Aligns session result assertions with Speech Quality naming |
| `e2e/session.spec.ts` | Modified | Aligns real-data session E2E selectors with Speech Quality naming |
| `README.md` | Modified | Syncs metrics, daily behavior, and structure docs |
| `CHANGELOG.md` | Modified | Adds 0.68.0 release notes |
| `docs/architecture/SYSTEM_SPEC.md` | Modified | Documents daily meta-session behavior |

## Architecture Decisions

| Decision | Why |
|----------|-----|
| Derive day detail from completed sessions | Avoids stale daily-detail blobs and keeps the surface grounded in actual session rows |
| Keep `DailyConclusion` as narrative cache | Reuses the existing end-of-day AI summary without making it the source of all visible data |
| Return `DAY_OPEN` before 10pm | Prevents premature current-day aggregation while the user can still add sessions |
| Move pronunciation map into transcript | Keeps word-level feedback close to the spoken text and reduces duplicate pronunciation panels |
| Scope every query by `userId` | Daily aggregation crosses multiple sessions, so auth scoping is non-negotiable |

## Testing Checklist

- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm test -- --run 'src/app/api/daily/[date]/route.test.ts' src/features/history/DayDetailContent/DayDetailContent.test.tsx src/components/ui/TranscriptToggle/TranscriptToggle.test.tsx`
- [x] `npm test -- --run` — 185 files passed, 1526 tests passed, 4 skipped
- [x] `npm test -- --run src/lib/daily/dayDetail/buildDayDetailSections.test.ts`
- [x] `npm run test:coverage` — 72.79% statements/lines
- [x] `npm run test:e2e` — verified by pre-push hook
- [x] `npm run build`

## Deployment Notes

No migration or new environment variable is required. The API response is additive for closed days and returns `DAY_OPEN` for current/future open days. Existing daily conclusions remain reusable as the narrative cache.
