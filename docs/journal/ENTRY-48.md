# ENTRY-48 — AI Disclosure, Transcript Pins, Today's Workout
**Date:** 2026-05-28
**Type:** Feature
**Branch:** `feat/disclosure-pins-workout`
**Version:** `0.43.0`
---
## What I Did
Added a one-time AI disclosure modal before first recording (OpenAI, Anthropic, Azure), backed by a new `AI_DISCLOSURE` consent flag. Built annotated transcript pins on session results that match insight examples to sentences. Added a Today's Workout hero card on the dashboard with a deterministic recommendation engine (welcome, workout, rest, completion states).

## Files Touched
| File | Action | Notes |
|------|--------|-------|
| `prisma/schema.prisma` | Modified | `AI_DISCLOSURE` enum value |
| `src/app/api/consent/ai-disclosure/route.ts` | Created | Consent check/record |
| `src/components/ui/AiDisclosureModal/` | Created | Modal UI |
| `src/features/recording/useAiDisclosure.ts` | Created | Client consent hook |
| `src/lib/text/splitSentences.ts` | Created | Sentence splitter |
| `src/lib/text/matchInsightsToSentences.ts` | Created | Insight matcher |
| `src/components/ui/AnnotatedTranscript/` | Created | Pinned transcript |
| `src/features/dashboard/todaysWorkout.ts` | Created | Recommendation engine |
| `src/features/dashboard/TodaysWorkout/` | Created | Hero card UI |
| `src/app/(app)/session/new/page.tsx` | Modified | Consent gate |
| `src/app/(app)/session/[id]/page.tsx` | Modified | Annotated transcript |
| `src/features/dashboard/DashboardView/DashboardView.tsx` | Modified | Workout card |
| `src/features/settings/SettingsPage/SettingsPage.tsx` | Modified | AI & Data section |

## Decisions
- Consent stored in `UserConsent` (not localStorage) for cross-device persistence.
- Regex sentence splitting — no NLP bundle for short transcripts.
- Workout engine runs client-side on dashboard data already in memory.
- Version `0.43.0` to stay ahead of existing journal versions.

## Still Open
- Map prompt library entries to metric keys for workout prompt suggestions.
- Apply pending Prisma migration in each environment.

## Validation
`npx tsc --noEmit && npm run build && npm run lint && npx prisma validate && npm test -- --run` — all passed.
