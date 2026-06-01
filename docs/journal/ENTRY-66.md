# Journal Entry 66 — 2026-06-01

**Type:** Feature
**Branch:** `feat/collocation-srs`
**Version:** 0.60.0

## Summary

Expanded the prompt library from 28 to 60+ prompts spanning 6 format types (opinion, monologue, image, retell, summarize, impromptu) with C2-level content, and added the 4-3-2 Timed Fluency training mode — a research-backed speaking exercise where users repeat the same topic across three rounds of decreasing duration (4→3→2 minutes) to build automaticity and fluency. The prompt library now features a multi-filter system (category × format × CEFR level) with pill-style AND-combined filters, replacing the single-row category tabs.

Additionally, built the Daily Summary feature for the history page — past days display a collapsed summary card showing average pillar scores (Delivery, Language, Pronunciation), new vocabulary words learned, and an AI-generated coaching note via Claude Haiku. Summaries are computed on-demand and cached in the database, with automatic invalidation when a new session completes for that day. The same day-grouping pattern was applied to the Reading Practice library view for visual consistency.

## Key Decisions

- **Static prompt data over database** — Prompts remain as TypeScript constants rather than a DB table. The dataset is small, changes infrequently, and benefits from type safety and zero-latency access. A migration to DB-backed prompts can happen later if user-generated content becomes a feature.
- **4-3-2 method** — Chosen because it is one of the best-supported fluency techniques in second language acquisition research (Nation, 1989). Repeating the same topic with decreasing time forces the speaker to drop hesitation patterns and automate language production — directly aligned with the app's C1→C2 coaching goal.
- **SM-2 reuse for round metrics** — Fluency rounds reuse the existing MetricSnapshot infrastructure for WPM and other metrics rather than introducing a parallel scoring model. This keeps the data model unified and allows fluency progress to feed into the dashboard naturally.
- **Auto-completion with grace period** — When the countdown reaches zero, the recording continues for a short grace period (5 seconds) to allow the speaker to finish their thought, then auto-stops. This avoids the jarring mid-sentence cutoff that would degrade user experience.
- **6 format types** — opinion (free-form argument), monologue (extended narrative), image (describe a visual), retell (recount a passage), summarize (condense information), impromptu (no preparation). Each format targets different speaking competencies — retell and summarize are especially useful for C2 candidates who need to demonstrate discourse control.
- **Polling for pending metrics** — FluencyComparison polls for metric availability since WPM and pronunciation data may arrive asynchronously from the pipeline. This avoids blocking the comparison view while metrics are still being computed.

## Files Created

- `src/lib/prompts/retellPassages.ts` — 8 retell source passages for the retell format
- `src/lib/prompts/imagePrompts.ts` — 8 image prompt metadata entries (references to `/prompts/images/*.webp`)
- `src/lib/prismaJson.ts` — JSON type helpers for Prisma
- `src/lib/typeGuards.ts` — Runtime type guard utilities
- `prisma/migrations/20260601220000_timed_fluency/migration.sql` — Adds `timed_fluency_sessions`, `timed_fluency_rounds` tables, and `TimedFluencyStatus` enum
- `src/app/api/fluency-sessions/route.ts` — POST (create session) + GET (list user sessions)
- `src/app/api/fluency-sessions/[id]/route.ts` — GET session detail with rounds
- `src/app/api/fluency-sessions/[id]/rounds/route.ts` — POST round (with auto-completion logic + metric backfill)
- `src/app/(app)/fluency-training/page.tsx` — Fluency training landing page
- `src/app/(app)/fluency-training/new/page.tsx` — New fluency session creator
- `src/app/(app)/fluency-training/[id]/page.tsx` — Active session page (recording + comparison)
- `src/features/fluency/TimedRecording/TimedRecording.tsx` — Countdown timer + round progression component
- `src/features/fluency/TimedRecording/TimedRecording.types.ts` — Props and types
- `src/features/fluency/TimedRecording/useTimedRecording.ts` — Timer logic, auto-stop, grace period
- `src/features/fluency/TimedRecording/index.ts` — Barrel export
- `src/features/fluency/FluencyComparison/FluencyComparison.tsx` — 3-round SVG bar chart comparison
- `src/features/fluency/FluencyComparison/FluencyComparison.types.ts` — Props and types
- `src/features/fluency/FluencyComparison/useFluencyComparison.ts` — Delta calculation + metric polling
- `src/features/fluency/FluencyComparison/index.ts` — Barrel export
- `src/features/fluency/FluencySessionList/FluencySessionList.tsx` — Past sessions with WPM progression
- `src/features/fluency/FluencySessionList/FluencySessionList.types.ts` — Props and types
- `src/features/fluency/FluencySessionList/index.ts` — Barrel export
- `prisma/migrations/20260602000000_daily_summary/migration.sql` — Adds `daily_summaries` table
- `src/lib/ai/generateDailyFeedback.ts` — Claude Haiku daily coaching note generator
- `src/app/api/users/me/daily-summaries/route.ts` — GET endpoint for computing/caching daily summaries
- `src/features/history/DailySummaryCard/DailySummaryCard.tsx` — Pillar score chips + feedback card
- `src/features/history/DailySummaryCard/DailySummaryCard.types.ts` — Types for daily summary data
- `src/features/history/DailySummaryCard/useDailySummaryCard.ts` — Lazy-load hook with Zod validation
- `src/features/history/DailySummaryCard/index.ts` — Barrel export

## Files Modified

- `prisma/schema.prisma` — Added `TimedFluencySession`, `TimedFluencyRound`, `DailySummary` models and `TimedFluencyStatus` enum
- `src/lib/prompts/promptLibrary.ts` — Expanded from 28 to 60+ prompts, added format field and C2 content
- `src/lib/prompts/promptLibrary.types.ts` — Added `PromptFormat` union type, updated `Prompt` interface with `format` field
- `src/lib/prompts/promptLibrary.test.ts` — 26 tests covering format distribution, CEFR levels, filter combinations
- `src/features/prompts/PromptLibraryView/PromptLibraryView.tsx` — Replaced single category tabs with 3-row multi-filter system (category, format, CEFR)
- `src/features/prompts/PromptLibraryView/PromptLibraryView.types.ts` — Added filter state types
- `src/features/prompts/LibraryPromptCard/LibraryPromptCard.tsx` — Added format badges, collapsible source text, dual action buttons (Quick Record + Start 4-3-2)
- `src/features/prompts/LibraryPromptCard/LibraryPromptCard.types.ts` — Updated props for format and actions
- `src/features/recording/PromptCard/PromptCard.tsx` — Updated to handle new prompt formats
- `src/components/ui/MoreSheet/MoreSheet.tsx` — Added "Fluency Training" navigation link with clock icon
- `src/app/(app)/prompts/page.tsx` — Updated prompts page for new library view
- `src/app/api/sessions/route.ts` — Minor refactor for shared types
- `src/app/api/sessions/[id]/chunk-results/route.ts` — Type narrowing improvements
- `src/app/api/cron/sweep-stuck-sessions/route.ts` — Type import updates
- `src/app/api/docs/spec/route.ts` — Added fluency endpoints to OpenAPI spec
- `src/app/api/internal/chunk-failed/route.ts` — Type import updates
- `src/app/api/internal/process-chunk-independent/route.ts` — Type import updates
- `src/app/api/internal/process-chunk/route.ts` — Type import updates
- `src/app/api/internal/process-final/route.ts` — Type import updates
- `src/app/api/internal/process/route.ts` — Type import updates
- `src/lib/ai/rewriteTranscript.ts` — Type import updates
- `src/lib/pipeline/mergePronunciation.ts` — Type import updates
- `src/lib/pipeline/persistPronunciation.ts` — Type import updates
- `src/lib/pipeline/pipelineRouteFailure.ts` — Type import updates
- `src/lib/pipeline/processChunk.ts` — Type import updates
- `src/lib/pipeline/processChunkIndependent.ts` — Type import updates
- `src/lib/pipeline/processFinalHelpers.ts` — Type import updates
- `src/lib/pipeline/processParallelFinal.ts` — Type import updates + daily summary invalidation
- `src/lib/pipeline/processFinal.ts` — Daily summary invalidation on session completion
- `src/lib/pipeline/processFinalHelpers.ts` — Added `invalidateDailySummary` helper
- `src/components/ui/HistoryDayGroup/HistoryDayGroup.tsx` — Added daily summary card + collapse/expand for past days
- `src/components/ui/HistoryDayGroup/HistoryDayGroup.types.ts` — Added `isToday` and `dateKey` props
- `src/app/(app)/history/page.tsx` — Passes `isToday` and `dateKey` to HistoryDayGroup
- `src/features/training/ReadingPractice/ReadingPractice.tsx` — Day grouping with daily summary cards
- `src/features/training/ReadingPractice/ReadingPractice.test.tsx` — Updated for collapse/expand behavior

## Testing

- 26 prompt library tests passing (format distribution, CEFR coverage, filter logic, C2 minimum count)
- 1,020 total tests passing across the project
- `npx tsc --noEmit` clean
