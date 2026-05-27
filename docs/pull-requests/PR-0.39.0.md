# PR-0.39.0 — No-Red Color System + Score Chips
**Branch:** `feat/score-chip-system` → `main`
**Version:** `0.39.0`
**Date:** 2026-05-27
**Status:** ✅ Ready to merge
---
## Summary
Replaces red error colors in pronunciation feedback with a coaching-oriented palette and introduces a reusable `ScoreChip` component. Low scores now show as "Sharpen" in gray/amber instead of punitive red, keeping learners in a growth mindset.

## Files Changed
| File | Action | Notes |
|------|--------|-------|
| `src/components/ui/ScoreChip/` | Created | Pill badge with ten/hundred scales |
| `src/components/ui/PhonemeDetail/usePhonemeDetail.ts` | Modified | `bg-gray-400` for low scores |
| `src/components/ui/PhonemeDetail/PhonemeDetail.tsx` | Modified | Amber substitution text + chips |
| `src/components/ui/WordColorMap/` | Modified | Amber color + updated legend |
| `src/components/ui/ProsodyPanel/ProsodyPanel.tsx` | Modified | Rate chip without parenthetical advice |
| `src/features/dashboard/MetricCard/MetricCard.tsx` | Modified | ScoreChip replaces LEVEL_STYLES |
| `package.json` | Modified | Version bump |

## Architecture Decisions
| Decision | Why |
|----------|-----|
| Single ScoreChip with two scales | One component serves dashboard (1–10) and phoneme (0–100) contexts |
| Gray bar + amber text for low scores | Visual hierarchy without alarm colors |
| Optional label override | ProsodyPanel rate status needs custom copy but shared chip styling |

## Testing Checklist
- [ ] WordColorMap: low-accuracy words render amber, not red
- [ ] PhonemeDetail: "You said" text is amber; low bar is gray; each row has a chip
- [ ] MetricCard: badge shows On track / Building / Sharpen from score
- [ ] ProsodyPanel: speaking rate shows chip label without parenthetical text
- [x] `npx tsc --noEmit` — zero errors
- [x] `npm run build` — clean build
- [x] `npm run lint` — zero lint errors
- [x] Red class grep in PhonemeDetail + WordColorMap — zero hits

## Deployment Notes
Client-only UI change. No migrations, env vars, or API changes required.

## Validation
```
grep -rn "bg-red-500|text-red-600|text-red-700|text-red-400" src/components/ui/PhonemeDetail src/components/ui/WordColorMap → zero hits
npx tsc --noEmit → exit 0
npm run lint → ✔ No ESLint warnings or errors
npm run build → ✓ Compiled successfully
```
