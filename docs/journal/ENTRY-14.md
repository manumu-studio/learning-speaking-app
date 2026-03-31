# ENTRY-14 — Dashboard Data Layer + Dark Mode
**Date:** 2026-03-31
**Type:** Feature
**Branch:** `feature/dashboard-data`
**Version:** `0.14.0`

---

## What I Did

Two distinct pieces of work landed in this branch.

**Dashboard data layer:** Built the complete server-side data layer to power the performance dashboard — a new database model for per-session metric scores, an extended AI analysis pipeline that outputs structured metric ratings alongside free-form insights, a server aggregation function computing weekly stats and trend data, and an authenticated API endpoint to expose it all.

**Dark/light mode + UI polish:** Added full dark/light mode support across the entire app. This included a theme provider, an animated toggle button, logo swapping, and dark-mode variants on every page and component. The animated canvas hero was extended to support both modes — with a blue-only wave palette and a separate light-mode rendering path that avoids the film grain effects that destroy readability on white.

## Files Touched

| File | Action | Notes |
|------|--------|-------|
| `prisma/schema.prisma` | Modified | New MetricSnapshot model with cascade delete and unique constraint per session/key |
| `prisma/seed.ts` | Modified | Extended to 7 DONE sessions with 42 MetricSnapshot records |
| `src/features/dashboard/dashboard.types.ts` | Created | MetricKey, MetricLevel, DashboardMetric, DashboardData, and related types |
| `src/features/dashboard/index.ts` | Created | Barrel export for the dashboard feature |
| `src/features/dashboard/getDashboardData.ts` | Created | Server-only aggregation: weekly stats, streak, trends, recent sessions |
| `src/lib/ai/analyze.ts` | Modified | Added 6-dimension metric scoring to prompt and Zod response schema |
| `src/app/api/internal/process/route.ts` | Modified | Stores MetricSnapshot records after analysis completes |
| `src/app/api/dev/process/route.ts` | Modified | Same metric storage with re-run safety (delete + recreate) |
| `src/app/api/dashboard/route.ts` | Created | GET /api/dashboard — authenticated, returns full DashboardData JSON |
| `src/app/globals.css` | Modified | Added `@variant dark` for class-based dark mode in Tailwind v4 |
| `src/app/layout.tsx` | Modified | Added ThemeProvider wrapping the app with `defaultTheme: dark` |
| `src/app/(public)/page.tsx` | Modified | Dark/light mode text and button colors; logo swap; fixed theme toggle |
| `src/app/(app)/layout.tsx` | Modified | Dark mode background on app shell |
| `src/app/(app)/history/page.tsx` | Modified | Dark mode text and error states |
| `src/app/(app)/session/new/page.tsx` | Modified | Dark mode heading |
| `src/app/(app)/session/[id]/page.tsx` | Modified | Dark mode headings and spinner |
| `src/components/ui/ThemeProvider/` | Created | next-themes wrapper (3 files) |
| `src/components/ui/ThemeToggle/` | Created | Animated half-moon SVG toggle connected to next-themes (3 files) |
| `src/components/ui/TopBar/TopBar.tsx` | Modified | Logo swap (black/white), ThemeToggle, dark mode classes |
| `src/components/ui/MainNav/MainNav.tsx` | Modified | Dark mode active/inactive link colors |
| `src/components/ui/HeroCanvas/HeroCanvas.tsx` | Modified | Blue-only palette; full light-mode rendering path |
| `src/components/ui/SessionHeader/SessionHeader.tsx` | Modified | Dark mode card + text |
| `src/components/ui/InsightCard/InsightCard.tsx` | Modified | Dark mode card, badges, text |
| `src/components/ui/FocusNextBanner/FocusNextBanner.tsx` | Modified | Dark mode indigo tones |
| `src/components/ui/HistorySessionCard/HistorySessionCard.tsx` | Modified | Dark mode card and text |
| `src/components/ui/HistoryDayGroup/HistoryDayGroup.tsx` | Modified | Dark mode date header |
| `src/components/landing/FeatureShowcase/FeatureShowcase.tsx` | Modified | Light/dark section backgrounds and card styles |
| `src/components/landing/HowItWorks/HowItWorks.tsx` | Modified | Light/dark section backgrounds, step icons |
| `src/components/landing/CtaFooter/CtaFooter.tsx` | Modified | Light/dark section backgrounds and CTA button |

## Decisions

- **Additive metrics, not replacement**: The `metrics` array is a new sibling field in the analysis output. Existing sessions without metrics show "Not enough data" in the dashboard UI.
- **Structured 6-dimension scoring**: Claude rates 6 fixed dimensions on a 1-10 scale, making trend graphing reliable vs. free-form strings.
- **Trend calculation**: Avg of last 3 vs. previous sessions, >10% change = improving/declining.
- **Streak logic**: `toDateString()` grouping, counts backward from today.
- **`currentFocus` is client-only**: The API always returns null — focus lives in localStorage.
- **Class-based dark mode**: `@variant dark (&:where(.dark, .dark *))` in Tailwind v4 CSS to enable the `.dark` class strategy used by next-themes.
- **`mounted` guard on ThemeToggle**: `useTheme()` returns `undefined` on SSR, causing a hydration mismatch on `aria-label`. The component renders a static placeholder until mounted.
- **Blue-only wave palette**: Hue locked to `215 ± 10` in light mode, `215 ± 20` in dark mode. Per-wave shift capped and clamped to ≤230° to prevent violet drift.
- **Light-mode canvas**: Skips `multiply` grain pass (destroys white backgrounds), scanlines, and color grading overlay. Uses `soft-light` at 0.15 opacity instead. Reduced wave amplitude scale (2.5× vs 5×) and opacity to preserve the atmospheric feel.

## Still Open

- Dashboard UI components not yet built — that's the next packet.
- No caching layer on `/api/dashboard` — deferred until usage patterns are clearer.

## Validation

```
npx prisma db push → schema in sync, MetricSnapshot table created
npx tsc --noEmit → 0 type errors
npm run build → clean production build
npm run lint → no warnings or errors
npm run db:seed → 42 metric snapshots seeded successfully
```
