# ENTRY-70 — Daily Conclusion System (Layer B Foundation)

**Date:** 2026-06-03
**Type:** Feature
**Branch:** feat/daily-feedback-language-bank
**Version:** 0.63.0

---

## What I Did

Built the Daily Conclusion engine — a structured aggregation layer that replaces the simple-average DailySummary with a rich, machine-comparable daily conclusion. The system computes pillar deltas, detects wins and struggles from metrics/naturalness/pronunciation data, generates a grounded AI coaching narrative with topic sentence, and presents it through a redesigned history UI.

## Files Touched

| File | Action | Notes |
|------|--------|-------|
| `prisma/schema.prisma` | Modified | Added `DailyConclusion` model + User relation |
| `prisma/migrations/20260603..._add_daily_conclusion/` | Created | Migration for daily_conclusions table |
| `src/lib/daily/generateDailyConclusion.types.ts` | Created | Zod schema + TypeScript types for structured conclusion JSON |
| `src/lib/daily/index.ts` | Created | Barrel exports for the daily engine |
| `src/lib/daily/computePillarDeltas.ts` | Created | Day-over-day pillar score deltas + overall score |
| `src/lib/daily/aggregateDayData.ts` | Created | Session aggregation into pillar scores, duration, intent labels |
| `src/lib/daily/detectWinsAndStruggles.ts` | Created | Win/struggle detection from metrics, naturalness flags, pronunciation |
| `src/lib/daily/renderConclusionNarrative.ts` | Created | Claude Haiku narrative + grounded topic sentence |
| `src/lib/daily/fetchDayData.ts` | Created | DB queries for day's session data (parallel fetching) |
| `src/lib/daily/generateDailyConclusion.ts` | Created | Cache-first orchestrator wiring all utilities together |
| `src/app/api/daily/[date]/route.ts` | Created | GET endpoint with lazy on-demand generation |
| `src/app/api/daily/conclude/route.ts` | Created | POST endpoint for explicit trigger |
| `src/features/history/DailySummaryCard/` | Rewritten | Subtle muted card: overall score + topic sentence + "use tomorrow" pills |
| `src/features/history/DayDetailContent/` | Created | Day detail view (meta-session) with hero + 3 collapsible sections |
| `src/app/(app)/history/day/[date]/page.tsx` | Created | Day detail page route |
| `src/components/ui/HistoryDayGroup/` | Modified | Wired onTapDay navigation to day detail |
| `src/app/(app)/history/HistorySessionList.tsx` | Modified | Added router navigation for day tap |
| `src/lib/pipeline/processFinalHelpers.ts` | Modified | Added DailyConclusion invalidation alongside DailySummary |

## Decisions

- **String dates, not DateTime** — `DailyConclusion.date` is a plain string (YYYY-MM-DD) to avoid timezone issues that plagued the old `DailySummary.date` (DateTime @db.Date)
- **Cache-first with pipeline invalidation** — conclusions are computed once and cached; the pipeline deletes the cache when a new session completes for that day
- **Placeholder active targets** — the 4 "use tomorrow" pills show top vocab suggestions from the day; real Language Bank tracking comes in 44T-B
- **On-demand only** — no cron or scheduled generation; conclusions generated lazily when the user views history
- **Old DailySummary coexists** — not removed since the pipeline and ReadingPractice still use it; both invalidation paths run in parallel
- **3 sections, not 5** — day detail shows Speech Quality, Pronunciation, General Feedback; Sessions list and Transcript sections deferred (need per-session data not yet in the conclusion API)

## Still Open

- Language Bank (44T-B) — mastery tracking, suggestion rotation, closed-loop with calque detection
- Per-session sections in day detail — Sessions list and Transcript panels need additional API data
- QStash cron trigger — replaces on-demand with scheduled 10pm generation

## Validation

```
npx tsc --noEmit    → clean
npx vitest run      → 57 new tests passing (8 suites)
```
