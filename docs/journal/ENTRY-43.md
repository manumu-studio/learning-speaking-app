# ENTRY-43 — No-Red Color System + Score Chips
**Date:** 2026-05-27
**Type:** Feature
**Branch:** `feat/score-chip-system`
**Version:** `0.39.0`
---
## What I Did
- Removed red scoring colors from pronunciation feedback UI in favor of a coaching-oriented amber/gray/green palette
- Built a reusable `ScoreChip` component that maps numeric scores to "On track", "Building", and "Sharpen" labels
- Wired ScoreChips into phoneme rows, dashboard metric cards, and the ProsodyPanel speaking-rate display
- Updated WordColorMap legend copy to match the new growth-mindset vocabulary

## Files Touched
| File | Action | Notes |
|------|--------|-------|
| `src/components/ui/ScoreChip/` | Created | 4-file pattern (no hook) |
| `src/components/ui/PhonemeDetail/usePhonemeDetail.ts` | Modified | Low bar color gray instead of red |
| `src/components/ui/PhonemeDetail/PhonemeDetail.tsx` | Modified | Amber "You said" text + per-row chips |
| `src/components/ui/WordColorMap/` | Modified | `red` → `amber`, legend labels |
| `src/components/ui/ProsodyPanel/ProsodyPanel.tsx` | Modified | Speaking-rate chip |
| `src/features/dashboard/MetricCard/MetricCard.tsx` | Modified | ScoreChip replaces level badge |
| `package.json` | Modified | `0.39.0` |

## Decisions
- Gray for sub-60 phoneme bars — still communicates low accuracy without alarm-signal red
- Two score scales (`ten` and `hundred`) keep one component usable across dashboard metrics and Azure phoneme scores
- Optional `label` prop on ScoreChip lets ProsodyPanel override tier text ("Ideal pace") while keeping tier colors

## Still Open
- Manual visual check on a live session results page recommended
- WordSentenceMap still uses red underlines (out of scope for this packet)

## Validation
```
grep red classes in PhonemeDetail + WordColorMap → zero hits
npx tsc --noEmit → exit 0
npm run lint → ✔ No ESLint warnings or errors
npm run build → ✓ Compiled successfully
```
