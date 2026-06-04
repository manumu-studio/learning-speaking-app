# ENTRY-75 — Daily Meta-Session Structure

**Date:** 2026-06-04
**Type:** Feature
**Branch:** `feat/daily-meta-session`
**Version:** 0.68.0

---

## What I Did

Built the closed-day experience as a true meta-session instead of a thin daily summary card. Closed days now assemble completed sessions into a structured detail view with Sessions, Speech Quality, Pronunciation & Intonation, General Feedback, and Transcript sections. The API still reuses the cached daily conclusion for the narrative pieces, but the visible detail data is rebuilt from scoped session rows so it reflects the latest stored results.

Updated History so today's sessions stay expanded before the 10pm local cutoff. After the cutoff, and for past days, History shows the daily card and opens the day detail view.

Reworked session transcript navigation so the pronunciation map lives inside the transcript toggle. This keeps word-level pronunciation detail near the original and improved transcript modes instead of splitting the same evidence across separate panels.

## Files Touched

| File | Action | Notes |
|------|--------|-------|
| `src/lib/daily/dayDetail/*` | Created | Daily read model builders, schemas, and orchestrator |
| `src/app/api/daily/[date]/route.ts` | Modified | Adds closed-day cutoff handling and `dayDetail` response |
| `src/app/api/daily/[date]/route.test.ts` | Modified | Covers closed-day detail response and open-day guard |
| `src/components/ui/HistoryDayGroup/HistoryDayGroup.tsx` | Modified | Keeps today's sessions open before 10pm |
| `src/features/history/DayDetailContent/*` | Modified | Renders five-section daily meta-session view |
| `src/components/ui/TranscriptToggle/*` | Modified | Adds pronunciation map mode and tests |
| `src/lib/daily/dayDetail/buildDayDetailSections.test.ts` | Created | Covers pure day detail section builders |
| `src/app/(app)/session/[id]/SessionFeedbackSections.tsx` | Modified | Renames Speech Quality and moves word map into transcript |
| `src/app/(app)/session/[id]/SessionDoneView.tsx` | Modified | Removes obsolete word-map timing prop |
| `src/app/(app)/session/[id]/page.test.tsx` | Modified | Updates session page assertions for Speech Quality naming |
| `e2e/session.spec.ts` | Modified | Updates real-data session E2E selectors for Speech Quality naming |
| `README.md` | Modified | Syncs metrics, daily behavior, and project structure |
| `CHANGELOG.md` | Modified | Adds 0.68.0 release notes |
| `docs/architecture/SYSTEM_SPEC.md` | Modified | Documents daily meta-session API and read model |

## Decisions

- **Read model over stored blob** — daily detail is derived from existing session data so it stays aligned with the actual completed sessions.
- **10pm cutoff in History and API** — users can keep adding sessions during the day without seeing a premature daily conclusion.
- **Cached conclusion only for narrative** — the daily conclusion remains useful, but it no longer owns the whole detail surface.
- **Pronunciation map inside transcript** — word-level pronunciation feedback is easier to understand when it appears beside the exact transcript text.

## Still Open

- Add richer visual polish to the day detail sections once real production data exposes the densest states.
- Consider timezone persistence if users need a day boundary different from the current local runtime cutoff.

## Validation

```
npm run typecheck
npm run lint
npm test -- --run 'src/app/api/daily/[date]/route.test.ts' src/features/history/DayDetailContent/DayDetailContent.test.tsx src/components/ui/TranscriptToggle/TranscriptToggle.test.tsx
npm test -- --run
npm test -- --run src/lib/daily/dayDetail/buildDayDetailSections.test.ts
npm run test:coverage
npm run test:e2e
npm run build
```

Final result: typecheck passed, lint passed, targeted tests passed, full suite passed with 185 files and 1526 tests passing (4 skipped), builder tests passed, coverage passed at 72.79% statements/lines, E2E passed in the pre-push hook, and production build passed.
