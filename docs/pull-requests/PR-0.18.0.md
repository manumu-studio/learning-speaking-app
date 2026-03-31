# PR-0.18.0 — Advanced drills, training history, dashboard drill stats
**Branch:** `feature/advanced-drills` → `main`
**Version:** `0.18.0`
**Date:** 2026-04-01
**Status:** ✅ Ready to merge
---
## Summary
Delivers the remaining precision and conclusion drill variants, a dedicated training history experience with API backing, motivational micro-wins after drills, and light drill activity indicators on the dashboard.

## Files Changed

| File | Action | Notes |
|------|--------|-------|
| Training core | Modified | Generation, evaluation, recommendations, drill shell |
| `src/app/api/drills/route.ts` | Modified | List + aggregate stats |
| `src/app/(app)/drills/page.tsx` | Created | Training history route |
| `src/features/training/*` | Created | MicroWin, DrillStats, DrillHistoryCard, DrillHistoryView |
| `src/components/ui/MainNav/MainNav.tsx` | Modified | Training nav |
| Dashboard feature | Modified | `drillStats`, IdentitySummary, MetricCard |

## Architecture Decisions

| Decision | Why |
|----------|-----|
| Template + rules for precision/conclusion | Predictable prompts, faster evaluation, matches specificity/conclusion checks |
| Aggregate queries for drill stats | Accurate all-time and weekly counts independent of list page size |
| Inline SVG dumbbell on metric cards | No chart/icon dependencies per design constraints |

## Testing Checklist
- [ ] Create precision drill from session → prompt quotes vague language, 60s limit
- [ ] Create conclusion drill → topic from intent or transcript, 120s limit
- [ ] Complete drill → MicroWin shows correct variant
- [ ] `/drills` shows stats, list, empty state for new users
- [ ] Training nav highlights on `/drills` and `/drill/[id]`
- [ ] Dashboard shows drill total and per-metric counts when data exists
- [ ] `npx tsc --noEmit && npm run build && npm run lint` clean

## Deployment Notes
- No schema migration; uses existing `DrillAttempt` model.
- No new environment variables.

## Validation

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | Pass |
| `npm run build` | Pass |
| `npm run lint` | Pass |
