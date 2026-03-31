# PR-0.14.1 — Dashboard UI

**Branch:** `feature/dashboard-ui` → `main`
**Version:** `0.14.0`
**Date:** 2026-03-31
**Status:** ✅ Ready to merge

---

## Summary

- Added the full `/dashboard` experience: weekly stats, metric grid with sparklines and trends, sticky focus selector, and skeleton loading
- SparkLine is a small SVG component (no chart library); dashboard feature folders follow the 4-file component pattern
- Training focus stored in localStorage for use when starting a new session (handled in the focus-to-session release)

## Files Changed

| File | Action | Notes |
|------|--------|-------|
| `src/components/ui/SparkLine/*` | Created | Sparkline UI (3 files) |
| `src/features/dashboard/IdentitySummary/*` | Created | Stats header (3 files) |
| `src/features/dashboard/MetricCard/*` | Created | Metric tiles (3 files) |
| `src/features/dashboard/FocusSelector/*` | Created | Focus banner (3 files) |
| `src/features/dashboard/DashboardSkeleton/*` | Created | Loading UI (3 files) |
| `src/features/dashboard/DashboardView/*` | Created | Orchestration + `useDashboard` (4 files) |
| `src/app/(app)/dashboard/page.tsx` | Created | Route |
| `src/components/ui/MainNav/MainNav.tsx` | Modified | Dashboard nav link |

## Architecture Decisions

| Decision | Why |
|----------|-----|
| Inline SVG SparkLine | No bundle cost; per-metric colors |
| `useId()` for gradients | Stable IDs, SSR-safe |
| localStorage for focus | Device-local preference until session upload reads it |
| ≥3 sessions to show metrics | Enough points for a meaningful sparkline/trend |

## Testing Checklist

- [ ] `/dashboard` loads (skeleton then data)
- [ ] Identity summary and metric cards match API data
- [ ] Selecting a metric updates the sticky focus banner
- [ ] Focus survives refresh
- [ ] Clear removes focus
- [ ] <3 sessions shows empty state
- [ ] Nav includes Dashboard between New Session and History

## Deployment Notes

No new env vars. No schema changes for this PR alone (depends on dashboard API from the data-layer PR).

## Validation

```
npx tsc --noEmit → 0 errors
npm run lint → ✔ No ESLint warnings or errors
npm run build → ✓ Compiled successfully
```
