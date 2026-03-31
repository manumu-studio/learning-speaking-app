# PR-0.17.0 — Core drills UI
**Branch:** `feature/core-drills` → `main`
**Version:** `0.17.0`
**Date:** 2026-03-31
**Status:** ✅ Ready to merge
---
## Summary
Adds the first drill recording and feedback experience: users can open a drill from session results, see instructions and timers, record an answer, view micro-feedback, and retry or navigate away. Session results surface a “Train This Pattern” card when analysis metrics are present.

## Files Changed

| File | Action | Notes |
|------|--------|-------|
| `src/features/training/DrillTimer/*` | Created | Prompt prep + recording cap |
| `src/features/training/DrillPromptCard/*` | Created | Drill copy + source quote |
| `src/features/training/DrillFeedback/*` | Created | Result + navigation actions |
| `src/features/training/DrillRecommendation/*` | Created | Results-page CTA |
| `src/features/training/DrillView/*` | Created | State machine + API + mic |
| `src/app/(app)/drill/[id]/page.tsx` | Created | Drill entry route |
| `src/app/(app)/session/[id]/page.tsx` | Modified | Weakest-metric recommendation |
| `src/features/session/useSessionStatus.types.ts` | Modified | Metrics on session model |
| `src/app/api/sessions/[id]/route.ts` | Modified | Return metrics with session |
| `src/app/api/drills/[id]/route.ts` | Modified | Return `sessionId` |

## Architecture Decisions

| Decision | Why |
|----------|-----|
| `useAudioRecorder` for drills | Same capture pipeline as session recording; less surface area than a second recorder. |
| `router.replace` after Try Again | URL should match the new `DrillAttempt` id. |
| Session GET includes `metrics` | Powers weakest-metric recommendation without a new endpoint. |

## Testing Checklist
- [ ] Complete a session with metrics → results show “Train This Pattern” when snapshots exist.
- [ ] Start drill → `/drill/[id]` loads instructions and prep timer.
- [ ] Start / stop recording → processing → feedback with correct badge.
- [ ] Try Again (from a drill created with a session) opens a new drill id.
- [ ] Back to Results and Go to Dashboard navigate as expected.
- [ ] Mobile layout readable on small widths.

## Deployment Notes
- No new environment variables.
- Depends on existing drills API and analysis pipeline producing metric snapshots.

## Validation
- `npx tsc --noEmit` — pass  
- `npm run build` — pass  
- `npm run lint` — pass  
