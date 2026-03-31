# ENTRY-18 — Advanced drills, history, and dashboard drill stats
**Date:** 2026-04-01
**Type:** Feature
**Branch:** `feature/advanced-drills`
**Version:** `0.18.0`
---
## What I Did
- Implemented precision and conclusion drills with template-based prompts, stricter time limits (60s / 120s), and heuristic evaluation paths distinct from Haiku-based drills.
- Added training history at `/drills` with summary stats, recent attempts, empty state, and a **Training** item in the main nav (including active state on individual drill pages).
- Surfaced drill activity on the dashboard: total drills under session stats, per-metric drill counts with a small inline icon, and `drillStats` on the dashboard payload.
- Added post-drill **MicroWin** messaging above the existing feedback actions.

## Files Touched

| File | Action | Notes |
|------|--------|-------|
| `src/features/training/generateDrill.ts` | Modified | Precision/conclusion branches |
| `src/features/training/evaluateDrill.ts` | Modified | Type-specific evaluation |
| `src/features/training/recommendDrill.ts` | Modified | Session context for generation |
| `src/app/api/drills/route.ts` | Modified | GET history + stats |
| `src/app/api/drills/[id]/complete/route.ts` | Modified | Pass `drillType` into evaluation |
| `src/features/training/DrillView/*` | Modified | Time limits, MicroWin |
| `src/features/training/MicroWin/*` | Created | Motivational banner |
| `src/features/training/DrillHistoryCard/*` | Created | List row |
| `src/features/training/DrillStats/*` | Created | Summary bar |
| `src/features/training/DrillHistoryView/*` | Created | Page client view + hook |
| `src/app/(app)/drills/page.tsx` | Created | Route |
| `src/components/ui/MainNav/MainNav.tsx` | Modified | Training link |
| `src/features/dashboard/*` | Modified | Types, data, cards, summary |

## Decisions
- Heuristic eval for precision/conclusion keeps feedback fast and aligned with the acceptance criteria; Haiku remains for other drill types.
- Drill history stats are computed from all completed attempts, while the list stays capped at 20 for performance and UI focus.
- Dashboard `byMetric` maps only known metric keys so stray DB values cannot break typing.
- `POST /api/drills` accepts optional `intentLabel` and `sessionTranscript` so “try again” and other clients can feed the same topic context as `recommendDrill`.

## Still Open
- Optional future work: persist session-level baseline bumps when `improved === true` if product wants that loop on the server.

## Validation

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | Pass |
| `npm run build` | Pass |
| `npm run lint` | Pass |
