# ENTRY-23 — UI polish: dark mode, bundle trim, reduced motion, accessibility

**Date:** 2026-04-02
**Type:** Feature
**Branch:** `feature/ui-polish`
**Version:** `0.23.0`

---

## What I Did
- Finished dark mode styling on dashboard stats and metric cards so text and borders stay readable when the app is in dark theme.
- Removed the unused `framer-motion` dependency after confirming the theme toggle relies only on CSS transitions and inline transforms.
- Added a global `prefers-reduced-motion: reduce` stylesheet rule so animations and transitions collapse to effectively instant timing for users who opt out of motion at the OS level.
- Improved accessibility: descriptive `aria-label` strings on metric and drill-history buttons, timer semantics on the drill countdown display, and a semantic description list for the identity summary stats grid.
- Bumped the app version to `0.23.0`.

## Files Touched (table: File | Action | Notes)
| File | Action | Notes |
|------|--------|-------|
| `package.json` | Updated | `0.23.0`; dropped unused animation library |
| `package-lock.json` | Updated | Lockfile after dependency change |
| `src/app/globals.css` | Updated | Reduced-motion media query |
| `src/components/ui/ThemeToggle/ThemeToggle.tsx` | Updated | CSS-only icon rotation |
| `src/features/dashboard/FocusSelector/FocusSelector.tsx` | Updated | Dark mode copy contrast |
| `src/features/dashboard/IdentitySummary/IdentitySummary.tsx` | Updated | `dl`/`dt`/`dd` + dark classes |
| `src/features/dashboard/MetricCard/MetricCard.tsx` | Updated | Dark states + button label |
| `src/features/training/DrillHistoryCard/DrillHistoryCard.tsx` | Updated | Button label |
| `src/features/training/DrillTimer/DrillTimer.tsx` | Updated | Live timer region |

## Decisions (rationale bullets)

- Chose a single global reduced-motion block so every transition inherits the same policy without touching each component.
- Used description list markup for headline stats so screen readers get explicit term/value relationships.

## Still Open (known gaps)
- No automated visual regression suite; dark mode and reduced motion should still be spot-checked in a browser (including DevTools reduced-motion emulation).

## Validation (commands + results)
- `npx tsc --noEmit`, `npm run lint`, `npm run build` — success (2026-04-02).
- `npx vitest run` — 6 files, 35 tests passed (2026-04-02).
