# PR-0.40.0 — Three-Pillar Dashboard Grouping
**Branch:** `feat/three-pillar-dashboard` → `main`
**Version:** `0.40.0`
**Date:** 2026-05-27
**Status:** ✅ Ready to merge
---
## Summary
Replaces the dashboard's two flat metric sections with three collapsible pillar cards (Delivery, Language, Pronunciation), each showing a headline score and sparkline. Session results gain a compact pillar summary row and coaching-first insight ordering.

## Files Changed
| File | Action | Notes |
|------|--------|-------|
| `src/features/dashboard/pillars.ts` | Created | Pillar config + score aggregation |
| `src/features/dashboard/PillarCard/` | Created | Collapsible pillar container |
| `src/features/dashboard/DashboardView/DashboardView.tsx` | Modified | Pillar-based layout |
| `src/app/(app)/session/[id]/page.tsx` | Modified | Hero row + insight sections |
| `src/features/dashboard/pillars.test.ts` | Created | Unit tests |
| `src/features/dashboard/PillarCard/PillarCard.test.tsx` | Created | Component tests |
| `package.json` | Modified | Version 0.40.0 |

## Architecture Decisions
| Decision | Why |
|----------|-----|
| Pure `pillars.ts` module | Dashboard and session page share pillar grouping without UI coupling |
| Collapsed-by-default PillarCards | Reduces cognitive load — users drill into one pillar at a time |
| Strengths-first insight split | Coaching flow: wins before growth areas |
| Page-local `PillarHeroRow` | Simpler than full PillarCard for read-only session summary |

## Testing Checklist
- [ ] Dashboard shows 3 PillarCards after 3+ sessions
- [ ] Expanding Delivery reveals 3 metrics; Language reveals 4; Pronunciation reveals 2 or empty-state
- [ ] Focus metric selection works inside expanded pillars
- [ ] Session results show 3-column pillar row when metrics exist
- [ ] Mixed insights split into "What went well" / "What to sharpen"
- [x] `npx tsc --noEmit` — zero errors
- [x] `npm run build` — clean build
- [x] `npm run lint` — zero errors
- [x] `npm test -- --run` — 441 passed

## Deployment Notes
Client-only UI change. No migrations, env vars, or API changes.

## Validation
```
npm test -- --run → 441 passed | 4 skipped
npx tsc --noEmit → exit 0
npm run lint → exit 0
npm run build → ✓ Compiled successfully
```
