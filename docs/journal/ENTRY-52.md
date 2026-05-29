# ENTRY-52 — Accessibility Hardening
**Date:** 2026-05-28
**Type:** Feature
**Branch:** `feat/accessibility-hardening`
**Version:** `0.48.0`
---
## What I Did
- Extracted the skip link into a reusable `SkipNavigation` component and fixed invalid nested `<main>` landmarks across app routes
- Made TranscriptSection keyboard-accessible with a single toggle button carrying full ARIA state
- Added global `:focus-visible` focus rings and aria-live regions on timers, feedback, errors, and focus banners
- Installed dev-only axe runtime checking and vitest-axe CI assertions across 8 component test files

## Files Touched
| File | Action | Notes |
|------|--------|-------|
| `src/components/ui/SkipNavigation/*` | Created | Skip link + 6 tests |
| `src/components/DevAxeInit/*` | Created | Dev-only axe, prod tree-shaken |
| `src/app/layout.tsx` | Modified | SkipNavigation + DevAxeInitSlot |
| `src/app/(app)/**` | Modified | Removed nested main elements |
| `src/components/ui/TranscriptSection/*` | Modified | Keyboard + 6 tests |
| `src/app/globals.css` | Modified | WCAG focus-visible rings |
| `src/components/ui/SessionTimer/*` | Modified | role=timer |
| `src/features/training/DrillFeedback/*` | Modified | aria-live on feedback |
| `src/components/ui/ProcessingStatus/*` | Modified | role=alert + 7 tests |
| `src/features/dashboard/FocusBanner/*` | Modified | aria-live + 5 tests |
| `src/__mocks__/rtl-setup.ts` | Modified | vitest-axe matcher |
| `**/*.test.tsx` | Modified | 5 existing + 3 new test files |

## Decisions
- DevAxeInit loads via `DevAxeInitSlot` with a build-time conditional dynamic import so axe never ships to production static chunks
- color-contrast axe rule disabled in tests because jsdom lacks computed-style support
- TranscriptSection header div is layout-only; the Show/Hide button is the sole interactive control

## Still Open
- Manual keyboard walkthrough of skip link focus order on all major routes

## Validation
```
npx tsc --noEmit → exit 0
npm run lint → ✔ No ESLint warnings or errors
npm run test → 663 passed | 4 skipped
npm run build → ✓ Compiled successfully
```
