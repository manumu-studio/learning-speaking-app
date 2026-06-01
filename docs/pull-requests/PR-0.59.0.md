# PR — v0.59.0 Register/Pragmatics + CEFR Estimation

**Branch:** `feat/register-cefr-estimation`
**Base:** `main`

## Summary

- Register & Pragmatics as 11th metric dimension with Claude-scored formality, hedging, and pragmatic competence analysis
- CEFR level estimation (below-C1 through C2) from weighted 3-pillar metric scores, shown on dashboard with sparkline trend
- SVG Skill Radar chart (10 axes, C2 threshold ring, no chart library)
- Major file split refactor: 4 files (719, 580, 503, 503 lines) → 15 focused modules under 300 lines

## What was built

### Register & Pragmatics Analysis
- New `registerPragmatics` metric scored by Claude alongside existing 7 text metrics
- Structured `registerFeedback` JSON with register classification, appropriateness, hedging level, directness, coaching suggestions
- Results page shows classification badges + before/after suggestion pairs in coaching tone

### CEFR Estimation
- Pure `estimateCefr()` utility: weighted pillar averages → CEFR level (pronunciation 25%, language 50%, delivery 25%)
- Strict C2 rule: all metrics ≥ 8.0 AND weighted avg ≥ 8.5
- Handles < 11 metrics gracefully (proportional weight redistribution)
- `User.estimatedCefrLevel` updated after every session completion
- `GET /api/users/me/cefr-history` returns longitudinal CEFR data for sparkline

### Dashboard
- Skill Radar: hand-drawn SVG, 10 axes, score polygon, dashed C2 threshold ring, hover tooltips
- CEFR Badge: color-coded level, weighted average, 8-session sparkline, "next milestone" coaching copy

### File Splits (0 regressions)
- `page.tsx` 719 → 6 files (max 217 lines)
- `analyze.ts` 580 → 2 files (234 + 425 prompt constants)
- `processFinal.ts` 503 → 3 files (max 234 lines)
- `ReadingPractice.tsx` 503 → 4 files (max 266 lines)

## Architecture decisions

- CEFR levels derived on-the-fly from MetricSnapshot per session — no separate history table needed
- `registerFeedback` stored as JSON on SpeakingSession for simple retrieval
- Radar uses `viewBox`-based SVG (no chart library) for zero-dependency rendering

## Testing

- 16 CEFR estimation unit tests (all thresholds + edge cases)
- 990 tests total — all passing
- `npx tsc --noEmit` — zero errors
- `npm run lint` — zero warnings

## How to validate

1. Complete a speaking session → verify `registerPragmatics` metric appears in MetricSnapshot
2. Session results page → Register & Pragmatics section visible with badges + suggestions
3. Dashboard → Skill Radar renders above pillar cards with 10+ axes
4. Dashboard → CEFR Badge shows level + sparkline (need ≥ 2 sessions for sparkline)
5. Pre-existing sessions without registerPragmatics still render correctly

## Deployment notes

- Requires Prisma migration: `npx prisma migrate dev --name add_register_cefr_fields`
- New fields: `SpeakingSession.registerFeedback Json?`, `User.estimatedCefrLevel String?`
- No environment variable changes
