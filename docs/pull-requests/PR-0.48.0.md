# PR-0.48.0 — Accessibility Hardening
**Branch:** `feat/accessibility-hardening` → `main`
**Version:** `0.48.0`
**Date:** 2026-05-28
**Status:** ✅ Ready to merge
---
## Summary
Addresses V6 audit accessibility gaps: semantic HTML fixes, keyboard navigation, focus indicators, screen reader live regions, and automated axe testing in dev and CI.

## Files Changed
| File | Action | Notes |
|------|--------|-------|
| `src/components/ui/SkipNavigation/*` | Created | Reusable skip link |
| `src/components/DevAxeInit/*` | Created | Dev-only axe runtime |
| `src/app/layout.tsx` | Modified | Skip nav + dev axe |
| `src/app/(app)/**` | Modified | Fix nested main |
| `src/components/ui/TranscriptSection/*` | Modified | Keyboard ARIA |
| `src/app/globals.css` | Modified | focus-visible styles |
| `src/components/ui/SessionTimer/*` | Modified | Timer semantics |
| `src/features/training/DrillFeedback/*` | Modified | Live feedback |
| `src/components/ui/ProcessingStatus/*` | Modified | Alert on failure |
| `src/features/dashboard/FocusBanner/*` | Modified | Live focus banner |
| `src/__mocks__/rtl-setup.ts` | Modified | vitest-axe |
| `**/*.test.tsx` | Modified/Created | 29 new a11y tests |
| `package.json` | Modified | 0.48.0 |

## Architecture Decisions
| Decision | Why |
|----------|-----|
| DevAxeInitSlot conditional dynamic import | Zero axe-core in production `.next/static/` |
| Single app layout `<main>` | Valid HTML landmark hierarchy |
| Button-only TranscriptSection toggle | Eliminates redundant div role=button |
| color-contrast disabled in vitest-axe | jsdom limitation; other rules still run |

## Testing Checklist
- [ ] Tab to skip link on landing and app pages — link appears and jumps to `#main-content`
- [ ] TranscriptSection Show/Hide works via keyboard only
- [ ] Focus ring visible on buttons/links in light and dark mode
- [ ] ProcessingStatus FAILED state announced by screen reader
- [ ] Dev console shows axe violations in `npm run dev`
- [ ] All 663 unit tests pass including axe assertions

## Deployment Notes
No migrations or env changes. New devDependencies only (`@axe-core/react`, `vitest-axe`).

## Validation
```
npx tsc --noEmit → exit 0
npm run lint → ✔ No ESLint warnings or errors
npm run test → 663 passed | 4 skipped
npm run build → ✓ Compiled successfully
grep -r "axe-core" .next/static/ | wc -l → 0
```
