# PR-0.23.0 — UI polish: dark mode, reduced motion, accessibility, smaller bundle

**Branch:** `feature/ui-polish` → `main`
**Version:** `0.23.0`
**Date:** 2026-04-02
**Status:** ✅ Ready to merge

---

## Summary
This release tightens dark-mode styling on dashboard and training UI, removes an unused client-side animation dependency, respects the user’s reduced-motion preference globally, and improves screen-reader support for metric selection, drill history rows, the drill timer, and the identity summary stats.

## Files Changed (table: File | Action | Notes)
| File | Action | Notes |
|------|--------|-------|
| `package.json` | Updated | `0.23.0`; removed unused dep |
| `package-lock.json` | Updated | Lockfile sync |
| `src/app/globals.css` | Updated | `prefers-reduced-motion: reduce` |
| `src/components/ui/ThemeToggle/ThemeToggle.tsx` | Updated | CSS-only rotation |
| `src/features/dashboard/FocusSelector/FocusSelector.tsx` | Updated | Dark readable text |
| `src/features/dashboard/IdentitySummary/IdentitySummary.tsx` | Updated | Semantic list + dark |
| `src/features/dashboard/MetricCard/MetricCard.tsx` | Updated | Dark + `aria-label` |
| `src/features/training/DrillHistoryCard/DrillHistoryCard.tsx` | Updated | `aria-label` |
| `src/features/training/DrillTimer/DrillTimer.tsx` | Updated | Timer ARIA |

## Architecture Decisions (table: Decision | Why)
| Decision | Why |
|----------|-----|
| Global reduced-motion CSS | One place to honor OS setting across Tailwind transitions |
| Drop `framer-motion` | Not referenced in source; theme toggle already CSS-based |
| `dl`/`dt`/`dd` for stats | Clear label/value association for assistive tech |

## Testing Checklist (checkboxes)
- [x] `npx vitest run` passes
- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes
- [x] `npm run build` passes
- [ ] Manual: dark mode — dashboard stats and metric cards readable
- [ ] Manual: DevTools emulate `prefers-reduced-motion: reduce` — transitions feel instant
- [ ] Manual: VoiceOver / NVDA — metric button and drill row labels make sense

## Deployment Notes
- No database migrations. Deploy is a standard static + server build; no new environment variables.

## Validation (commands + results)
- `npx vitest run` — 35 tests passed (2026-04-02).
- `npx tsc --noEmit`, `npm run lint`, `npm run build` — success (2026-04-02).
