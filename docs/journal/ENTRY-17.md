# ENTRY-17 — Core drills UI (first three drill types)
**Date:** 2026-03-31
**Type:** Feature
**Branch:** `feature/core-drills`
**Version:** `0.17.0`
---
## What I Did
Built the end-to-end drill experience for rephrase, constraint, vocabulary upgrade (plus mapped types for precision/conclusion in UI): timers and prompt/feedback/recommendation components, a client drill flow that records audio and posts to the existing drill completion API, a `/drill/[id]` page, and a session results card that recommends a drill from the weakest metric snapshot and starts a new drill via the drills API.

## Files Touched

| File | Action | Notes |
|------|--------|-------|
| `src/features/training/DrillTimer/*` | Created | Countdown / count-up |
| `src/features/training/DrillPromptCard/*` | Created | Instructions + quote |
| `src/features/training/DrillFeedback/*` | Created | Micro-feedback + CTAs |
| `src/features/training/DrillRecommendation/*` | Created | Post-session card |
| `src/features/training/DrillView/*` | Created | Orchestration + `useDrill` |
| `src/app/(app)/drill/[id]/page.tsx` | Created | Drill route |
| `src/app/(app)/session/[id]/page.tsx` | Modified | Recommendation + create drill |
| `src/features/session/useSessionStatus.types.ts` | Modified | Session metrics typing |
| `src/app/api/sessions/[id]/route.ts` | Modified | Include metric snapshots |
| `src/app/api/drills/[id]/route.ts` | Modified | Expose `sessionId` for retries |

## Decisions
- Reused `useAudioRecorder` instead of a separate recorder component so behavior stays aligned with the main recording path.
- Returned `sessionId` on drill GET and included `metrics` on session GET so the UI can satisfy create-drill validation and pick a weakest metric without guesswork.
- Used stable refs + `useLayoutEffect` where the linter rejected “latest callback” patterns during render.

## Still Open
- Precision-only and conclusion-heavy UX polish can wait for the next training UI slice.
- Users who land on a drill without a linked session see a clear limit on “Try Again” until we define another content source for examples.

## Validation
- `npx tsc --noEmit` — pass  
- `npm run build` — pass  
- `npm run lint` — pass  
