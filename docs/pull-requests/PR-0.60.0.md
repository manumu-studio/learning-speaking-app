# PR — v0.60.0: Prompt Library v2 + Timed Fluency + Daily Summary

## Summary

- Expanded prompt library from 28 to 60+ prompts with 6 format types and C2-level content
- Built multi-filter system (category × format × CEFR level) with pill-style AND-combined filters
- Implemented 4-3-2 Timed Fluency training — a research-backed fluency exercise with 3 rounds of decreasing duration on the same topic
- Added full data model, API layer, recording UI, comparison view, and session history for timed fluency
- Added Daily Summary cards to history and reading practice views — past days show pillar averages, new vocab, and AI coaching feedback

## What Was Built

### Prompt Library v2

The prompt library was expanded from 28 to 60+ prompts spanning 6 format types:

- **Opinion** — Free-form argument prompts (existing format, now explicitly tagged)
- **Monologue** — Extended narrative/storytelling prompts
- **Image** — Describe or analyze a visual (8 image metadata entries referencing `/prompts/images/*.webp`)
- **Retell** — Recount a source passage in your own words (8 passages)
- **Summarize** — Condense information into key points
- **Impromptu** — No-preparation prompts for spontaneous speech

At least 6 prompts target C2-level content, ensuring advanced learners have challenging material.

The filter system was overhauled from a single category tab row to a 3-row pill-based filter:

1. **Category** row — filters by topic domain
2. **Format** row — filters by prompt type
3. **CEFR Level** row — filters by difficulty level

All filters combine with AND logic. Active filters appear as highlighted pills. The existing `LibraryPromptCard` was updated with format badges, collapsible source text for retell/summarize formats, and dual action buttons: "Quick Record" (direct to recording) and "Start 4-3-2" (launches a timed fluency session).

### 4-3-2 Timed Fluency Training

Based on Paul Nation's 4-3-2 technique from second language acquisition research, this feature lets users practice the same topic across three rounds of decreasing duration (4 minutes → 3 minutes → 2 minutes). Each repetition forces the speaker to compress their delivery, reducing hesitation and building automaticity.

**Data model:**

- `TimedFluencySession` — links a user to a prompt with status tracking (`IN_PROGRESS`, `COMPLETED`, `ABANDONED`)
- `TimedFluencyRound` — stores each round's speaking session reference, round number, and duration
- Prisma migration `20260601220000_timed_fluency` adds both tables and the `TimedFluencyStatus` enum

**API routes:**

- `POST /api/fluency-sessions` — Create a new timed fluency session
- `GET /api/fluency-sessions` — List user's fluency sessions
- `GET /api/fluency-sessions/[id]` — Get session detail with rounds
- `POST /api/fluency-sessions/[id]/rounds` — Submit a round recording (handles auto-completion when round 3 is submitted, triggers metric backfill)

**UI components:**

- `TimedRecording` — Countdown timer with round progression (4→3→2), auto-stop with 5-second grace period, round indicator
- `FluencyComparison` — 3-round comparison view with SVG bar charts showing WPM across rounds, delta percentages, and polling for pending metrics
- `FluencySessionList` — Past sessions list with WPM progression sparklines

**Pages:**

- `/fluency-training` — Landing page showing past sessions and a "Start New" button
- `/fluency-training/new` — Session creator (select prompt, begin)
- `/fluency-training/[id]` — Active session with recording and comparison view

**Navigation:**

- "Fluency Training" link added to the MoreSheet navigation menu with a clock icon

### Daily Summary

Past days in the session history and reading practice views now display a summary card with:

- **Pillar score chips** — average Delivery, Language, and Pronunciation scores for the day
- **New vocabulary** — up to 3 new words learned that day
- **AI coaching feedback** — a 2-3 sentence note from Claude Haiku with gym-coach tone

Daily summaries are computed on-demand and cached in the `DailySummary` database model. When a new session completes, the pipeline invalidates the cached summary for that day so it regenerates on the next page view. Today's sessions remain expanded without a summary card (day still in progress).

**Data model:**

- `DailySummary` — caches pillar averages, new words, and AI feedback per (userId, date) with unique constraint
- Prisma migration `20260602000000_daily_summary` adds the `daily_summaries` table

**API:**

- `GET /api/users/me/daily-summaries?date=YYYY-MM-DD` — computes or returns cached summary; rejects today's date with 400

**Components:**

- `DailySummaryCard` — 4-file component showing pillar chips, new words, and feedback with skeleton loading
- `HistoryDayGroup` — updated with `isToday`/`dateKey` props, collapse/expand toggle for past days
- `ReadingPractice` — day grouping with summary cards applied to the reading practice library view

**Pipeline integration:**

- `invalidateDailySummary()` in `processFinalHelpers.ts` — deletes cached summary when session completes, called from both `processFinal` and `processParallelFinal`

## Architecture Decisions

- **Static prompts** — Prompts are TypeScript constants, not database records. The dataset is small and changes infrequently. Type safety and zero-latency access outweigh the flexibility of a DB-backed approach at this stage.
- **SM-2 reuse** — Fluency rounds link to regular SpeakingSessions for metric computation, reusing the existing MetricSnapshot pipeline rather than building a parallel scoring system.
- **Auto-completion with grace period** — A 5-second grace window after countdown reaches zero lets speakers finish their thought naturally before auto-stopping, avoiding jarring mid-sentence cutoffs.
- **Polling for pending metrics** — FluencyComparison polls the API for metric availability since WPM and pronunciation scores arrive asynchronously through the pipeline. This keeps the UI responsive while data is still processing.
- **AND-combined filters** — All three filter dimensions (category, format, CEFR) combine with AND logic. This gives users precise control and avoids the confusion of OR-combined filters showing unexpected results.

## Testing

- 26 prompt library tests covering:
  - Minimum prompt count (60+)
  - All 6 format types present
  - At least 6 C2-level prompts
  - Filter combinations (category × format × CEFR)
  - Format distribution across categories
- 1,020 total tests passing
- `npx tsc --noEmit` clean
- No lint warnings

## Deployment Notes

- **Prisma migrations:** `20260601220000_timed_fluency` adds fluency tables + enum. `20260602000000_daily_summary` adds `daily_summaries` table. Run `npx prisma migrate deploy` before deploying.
- **No new environment variables** required.
- **Image prompts:** Reference `/prompts/images/*.webp` — actual image files need to be added to `public/prompts/images/` before the image format is fully functional. All other formats work immediately.
- **Backward compatible:** Existing 28 prompts gain a `format` field but behavior is unchanged. No breaking changes to existing functionality.

## Verification Checklist

- [ ] Navigate to `/prompts` → see 60+ prompts with multi-filter system
- [ ] Filter by Category → only matching prompts shown
- [ ] Filter by Format → only matching format prompts shown
- [ ] Filter by CEFR Level → only matching level prompts shown
- [ ] Combine filters → AND logic correctly narrows results
- [ ] Start 4-3-2 from a prompt card → creates fluency session
- [ ] Complete round 1 (4 min) → progress to round 2
- [ ] Complete round 2 (3 min) → progress to round 3
- [ ] Complete round 3 (2 min) → see comparison view with WPM improvement
- [ ] Fluency Training link appears in More menu
- [ ] Past sessions show WPM progression
- [ ] Retell prompts show collapsible source passage
- [ ] History page: past days show daily summary card with pillar chips
- [ ] History page: past day sessions collapsed by default, toggle to expand
- [ ] Today's sessions shown expanded without summary card
- [ ] Reading practice: past days grouped with daily summary cards
