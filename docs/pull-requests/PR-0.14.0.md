# PR-0.14.0 — Dashboard Data Layer + Dark Mode
**Branch:** `feature/dashboard-data` → `main`
**Version:** `0.14.0`
**Date:** 2026-03-31
**Status:** ✅ Ready to merge

---

## Summary

- Extended the AI analysis pipeline to output structured metric scores (6 dimensions, 1-10 scale) alongside existing insights
- Added `MetricSnapshot` database model to persist per-session scores with cascade delete
- Built `getDashboardData` server function computing weekly stats, streak, metric trends, and recent sessions
- Exposed aggregated data via `GET /api/dashboard` authenticated endpoint
- Added full dark/light mode support across all pages with `next-themes` and an animated toggle button
- Added logo swapping in TopBar and hero (black logo in light mode, white in dark mode)
- Locked canvas wave animation to a blue-only palette with a clean light-mode rendering path

## Files Changed

### Dashboard Data Layer

| File | Action | Notes |
|------|--------|-------|
| `prisma/schema.prisma` | Modified | MetricSnapshot model; `metrics` relation on SpeakingSession |
| `prisma/seed.ts` | Modified | 7-session seed with 42 MetricSnapshot records |
| `src/features/dashboard/dashboard.types.ts` | Created | Full type surface for dashboard feature |
| `src/features/dashboard/index.ts` | Created | Barrel export |
| `src/features/dashboard/getDashboardData.ts` | Created | Server-only aggregation function |
| `src/lib/ai/analyze.ts` | Modified | metricSchema Zod type + prompt extension |
| `src/app/api/internal/process/route.ts` | Modified | MetricSnapshot createMany after analysis |
| `src/app/api/dev/process/route.ts` | Modified | MetricSnapshot delete + recreate for re-run safety |
| `src/app/api/dashboard/route.ts` | Created | GET /api/dashboard endpoint |

### Dark/Light Mode + UI

| File | Action | Notes |
|------|--------|-------|
| `src/app/globals.css` | Modified | `@variant dark` for class-based dark mode in Tailwind v4 |
| `src/app/layout.tsx` | Modified | ThemeProvider with `defaultTheme: dark` |
| `src/app/(public)/page.tsx` | Modified | Theme-aware colors, logo, fixed theme toggle |
| `src/app/(app)/layout.tsx` | Modified | Dark mode app shell background |
| `src/app/(app)/history/page.tsx` | Modified | Dark mode text and error states |
| `src/app/(app)/session/new/page.tsx` | Modified | Dark mode heading |
| `src/app/(app)/session/[id]/page.tsx` | Modified | Dark mode headings and spinner |
| `src/components/ui/ThemeProvider/` | Created | next-themes wrapper (3 files) |
| `src/components/ui/ThemeToggle/` | Created | Animated half-moon SVG toggle (3 files) |
| `src/components/ui/TopBar/TopBar.tsx` | Modified | Logo swap, ThemeToggle, dark mode classes |
| `src/components/ui/MainNav/MainNav.tsx` | Modified | Dark mode link colors |
| `src/components/ui/HeroCanvas/HeroCanvas.tsx` | Modified | Blue-only palette; full light-mode canvas path |
| `src/components/ui/SessionHeader/SessionHeader.tsx` | Modified | Dark mode |
| `src/components/ui/InsightCard/InsightCard.tsx` | Modified | Dark mode |
| `src/components/ui/FocusNextBanner/FocusNextBanner.tsx` | Modified | Dark mode |
| `src/components/ui/HistorySessionCard/HistorySessionCard.tsx` | Modified | Dark mode |
| `src/components/ui/HistoryDayGroup/HistoryDayGroup.tsx` | Modified | Dark mode |
| `src/components/landing/FeatureShowcase/FeatureShowcase.tsx` | Modified | Light/dark section styles |
| `src/components/landing/HowItWorks/HowItWorks.tsx` | Modified | Light/dark section styles |
| `src/components/landing/CtaFooter/CtaFooter.tsx` | Modified | Light/dark section styles |

## Architecture Decisions

| Decision | Why |
|----------|-----|
| Metrics are additive to insights | Backward compatibility — existing sessions without metrics don't break |
| `@@unique([sessionId, key])` on MetricSnapshot | Prevents duplicates; enables safe `skipDuplicates` retries |
| `currentFocus` always null from server | Focus lives in client localStorage only |
| Trend threshold at 10% | Avoids noise from minor variation while detecting real progress |
| `externalId` auth pattern | Consistent with existing routes |
| `@variant dark` in Tailwind v4 CSS | Enables `.dark` class strategy for next-themes without a config file |
| `mounted` guard on ThemeToggle | Prevents SSR/client hydration mismatch on `aria-label` (next-themes returns `undefined` on server) |
| Blue-only palette, hue clamped ≤230° | Prevents drift into violet/purple on per-wave hue shifts |
| Light-mode canvas skips multiply + scanlines | `multiply` blend at near-full opacity on white = dark static; removed along with scanlines and color grading |

## Testing Checklist

- [ ] `npx prisma db push` — MetricSnapshot table exists in DB
- [ ] `npm run db:seed` — seeds 42 metric snapshots without errors
- [ ] `GET /api/dashboard` (unauthenticated) — returns 401
- [ ] `GET /api/dashboard` (authenticated) — returns full DashboardData JSON with all 6 metrics
- [ ] Verify streak calculation reflects seeded 7-day consecutive run
- [ ] Record a new session via dev pipeline — verify 6 MetricSnapshot records created
- [ ] Re-run dev pipeline on same session — no duplicate metrics, no crash
- [ ] Dark mode toggle on landing page — theme persists on refresh
- [ ] Light mode — waves are soft blue, no purple tint, no film grain static
- [ ] TopBar shows correct logo variant in each theme
- [ ] No hydration errors in browser console

## Deployment Notes

- Run `npx prisma db push` or `npx prisma migrate deploy` in production before deploying
- New npm dependencies: `next-themes`, `framer-motion`
- No new environment variables required
- Backward compatible — existing sessions without MetricSnapshot rows return zeros

## Validation

```
npx tsc --noEmit → 0 type errors
npm run build → clean build, all 16 routes registered
npm run lint → no warnings or errors
npm run db:seed → 42 metric snapshots seeded
```
