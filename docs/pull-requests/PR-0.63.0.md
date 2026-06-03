# PR-0.63.0 — Daily Conclusion System

**Branch:** `feat/daily-feedback-language-bank` → `main`
**Version:** `0.63.0`
**Date:** 2026-06-03
**Status:** ✅ Ready to merge

---

## Summary

Introduces the Daily Conclusion engine — a structured aggregation layer that produces rich, machine-comparable daily summaries with pillar deltas, win/struggle detection, and AI-generated coaching narratives. Replaces the old simple-average daily card with a subtle, muted design and adds a new day detail page.

## What was built

### Backend
- **DailyConclusion Prisma model** — stores structured JSON, coaching narrative, topic sentence, and flat pillar scores
- **Pure utility functions** — `computePillarDeltas`, `aggregateDayData`, `detectWinsAndStruggles` (all tested independently)
- **AI narrative renderer** — single Claude Haiku call generates both coaching narrative and grounded topic sentence from the day's intent labels
- **Cache-first orchestrator** — parallel DB fetching, Zod-validated output, writes to DB on first access
- **Pipeline invalidation** — DailyConclusion cache cleared alongside DailySummary when a new session completes

### API
- `GET /api/daily/[date]` — fetch or lazily generate a conclusion for a specific date
- `POST /api/daily/conclude` — explicitly trigger conclusion generation

### Frontend
- **Subtle DailySummaryCard** — overall score, topic sentence, formatted duration, and 4 "use tomorrow" pills (placeholder until Language Bank)
- **Day detail page** (`/history/day/[date]`) — meta-session view with day hero + Speech Quality, Pronunciation, and General Feedback sections
- **Navigation wired** — tapping a daily card navigates to the day detail view

## Architecture decisions

| Decision | Why |
|----------|-----|
| String dates (not DateTime) | Avoids timezone issues with UTC/Postgres date boundaries |
| On-demand generation only | No cron infrastructure yet; lazy compute is sufficient for single-user |
| DailySummary coexists | Pipeline and ReadingPractice still use it; migration is deferred |
| Wins capped at 3, struggles at 5 | Prevents information overload; focuses on highest-impact signals |
| Placeholder active targets | Top 4 vocab suggestions from the day; real Language Bank comes in next PR |

## Testing

- [x] 57 new tests across 8 test files
- [x] computePillarDeltas — 8 tests
- [x] aggregateDayData — 8 tests
- [x] detectWinsAndStruggles — 10 tests
- [x] renderConclusionNarrative — 10 tests (mocked Haiku)
- [x] generateDailyConclusion — 5 tests
- [x] GET /api/daily/[date] — 4 tests
- [x] POST /api/daily/conclude — 4 tests
- [x] DailySummaryCard — 8 tests
- [x] `npx tsc --noEmit` clean
- [ ] Manual verification: open history, tap a day card, verify day detail renders

## Deployment notes

- Prisma migration `20260603073548_add_daily_conclusion` must run before deploy
- The old `/api/users/me/daily-summaries` endpoint is unchanged — no breaking changes
- Claude Haiku API key must be configured (already in production)
