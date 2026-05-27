# ENTRY-44 — Three-Pillar Dashboard Grouping
**Date:** 2026-05-27
**Type:** Feature
**Branch:** `feat/three-pillar-dashboard`
**Version:** `0.40.0`
---
## What I Did
- Grouped nine dashboard metrics into Delivery, Language, and Pronunciation pillars with headline scores and sparklines
- Built a collapsible `PillarCard` so users see one summary per pillar before expanding detail
- Added a session-results hero row with per-pillar averages and coaching chips
- Reordered session insights into "What went well" and "What to sharpen" sections

## Files Touched
| File | Action | Notes |
|------|--------|-------|
| `src/features/dashboard/pillars.ts` | Created | Config + `computePillarScores` |
| `src/features/dashboard/PillarCard/` | Created | Collapsible pillar UI |
| `src/features/dashboard/DashboardView/DashboardView.tsx` | Modified | 3-pillar dashboard |
| `src/app/(app)/session/[id]/page.tsx` | Modified | Hero row + insight split |
| `src/features/dashboard/pillars.test.ts` | Created | Score computation tests |
| `src/features/dashboard/PillarCard/PillarCard.test.tsx` | Created | Component tests |

## Decisions
- Missing constituent metrics are excluded from pillar averages rather than treated as zero — avoids punishing incomplete data
- Element-wise sparkline averaging uses the shortest history length when arrays differ in size
- Session hero uses inline components instead of reusing `PillarCard` — no expand/sparkline needed on results page
- Insight split uses severity + score heuristics with loose category matching instead of a rigid category map

## Still Open
- Category-to-metric matching for insights is heuristic; some AI category strings may not align with metric keys

## Validation
```
npm test -- --run → 441 passed
npx tsc --noEmit → exit 0
npm run lint → exit 0
npm run build → ✓ Compiled successfully
```
