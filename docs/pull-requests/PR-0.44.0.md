# PR-0.44.0 — AI Disclosure + Transcript Pins + Today's Workout
**Branch:** `feat/disclosure-pins-workout` → `main`
**Version:** `0.44.0`
**Date:** 2026-05-28
**Status:** ⏳ Pending review
---
## Summary
Three user-facing features: a one-time AI disclosure consent modal (Apple Guideline 5.1.2(i)), inline coaching pins on session transcripts that match insight examples to sentences, and a dashboard "Today's Workout" hero card with a deterministic recommendation engine.

## Files Changed
| File | Action | Notes |
|------|--------|-------|
| `prisma/schema.prisma` | Modified | Added `AI_DISCLOSURE` to `ConsentFlag` enum |
| `prisma/migrations/20260528153550_add_ai_disclosure_consent_flag/` | Created | Additive enum migration |
| `src/app/api/consent/ai-disclosure/route.ts` | Created | GET/POST consent with auth + CSRF |
| `src/components/ui/AiDisclosureModal/` | Created | 3-file component: modal with provider table, focus trap, a11y |
| `src/features/recording/useAiDisclosure.ts` | Created | Discriminated union state hook with Zod validation |
| `src/lib/text/splitSentences.ts` | Created | Regex sentence splitter with character offsets |
| `src/lib/text/matchInsightsToSentences.ts` | Created | Substring + word-overlap matcher for insight→sentence mapping |
| `src/lib/text/annotationTypes.ts` | Created | PinVariant, SentenceAnnotation, AnnotationMap types |
| `src/components/ui/AnnotatedTranscript/` | Created | 4-file + PinBadge sub-component: collapsible transcript with coaching pins |
| `src/features/dashboard/todaysWorkout.ts` | Created | Deterministic recommendation engine (welcome/workout/rest states) |
| `src/features/dashboard/TodaysWorkout/` | Created | 4-file component: hero card with pillar colors + completion state |
| `src/features/dashboard/todaysWorkout.test.ts` | Created | 12 unit tests for recommendation engine |
| `src/lib/text/splitSentences.test.ts` | Created | 7 tests for sentence splitting |
| `src/lib/text/matchInsightsToSentences.test.ts` | Created | 5 tests for insight matching |
| `src/app/(app)/session/new/page.tsx` | Modified | Consent gate before recording |
| `src/app/(app)/session/[id]/page.tsx` | Modified | AnnotatedTranscript replaces TranscriptSection |
| `src/features/dashboard/DashboardView/DashboardView.tsx` | Modified | TodaysWorkout card above pillar cards |
| `src/features/settings/SettingsPage/SettingsPage.tsx` | Modified | AI & Data section with info-only modal |
| `src/lib/db-utils.ts` | Modified | AI_DISCLOSURE added to consent types |
| `package.json` | Modified | Version bump to 0.44.0 |

## Architecture Decisions
| Decision | Why |
|----------|-----|
| DB-backed consent via UserConsent | Survives reinstall; Apple requires before first use |
| Regex sentence splitting (no NLP) | Short transcripts; zero bundle weight; fully synchronous |
| Substring + word-overlap matching | Claude's examples are verbatim excerpts; zero latency |
| Client-side recommendation engine | Dashboard data already in memory; no new API needed |
| Deterministic algorithm (no AI) | Instant, predictable, testable |
| PinBadge internal to AnnotatedTranscript | Tightly coupled to annotation model, not shared |
| Focus trap on disclosure modal | WCAG 2.1 SC 2.1.2 compliance for modal dialogs |

## Testing
- 545 tests passing, 79 test files
- 24 new tests (12 workout engine + 7 sentence splitter + 5 insight matcher)
- Quality gates: tsc ✅ | build ✅ | lint ✅ | tests ✅
- Code audit: PASS (all compliance checks clean)

## Testing Checklist
- [ ] First-time user sees disclosure modal before recording
- [ ] Accepting disclosure persists (modal doesn't reappear)
- [ ] Settings → AI & Data shows info-only modal
- [ ] Session results show coaching pins on matched sentences
- [ ] Pin badges show correct variant colors (strength/building/sharpen)
- [ ] Dashboard shows Today's Workout card with correct state
- [ ] Completion state shows after training the recommended metric
- [ ] Rest state shows when user already trained today

## Deployment Notes
- Run `npx prisma migrate deploy` — adds `AI_DISCLOSURE` to `ConsentFlag` enum (additive, zero downtime)
- No new environment variables
- No breaking changes to existing data
