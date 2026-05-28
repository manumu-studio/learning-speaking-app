# PR-0.43.0 — Settings + Prompt Library + History Trends
**Branch:** `feat/settings-prompts-trends` → `main`
**Version:** `0.43.0`
**Date:** 2026-05-28
**Status:** ⏳ Pending audit
---
## Summary
Three user-facing features on a single branch: a full Settings page (DB-backed preferences with optimistic updates), a 28-prompt curated library that threads prompt context into Claude analysis, and an SVG-based pillar trends page with time-range filtering and metric drill-down.

## Files Changed
| File | Action | Notes |
|------|--------|-------|
| `prisma/schema.prisma` | Modified | Added `UserSettings` model + `settings` relation on User |
| `prisma/migrations/20260527235318_add_user_settings/` | Created | CreateTable + unique constraint |
| `src/lib/schemas/trends.ts` | Created | Shared Zod schemas for trends API (extracted from route) |
| `src/app/api/settings/route.ts` | Created | GET/PATCH with Zod validation, upsert pattern |
| `src/app/api/metrics/trends/route.ts` | Created | Time-series metric data, pillar aggregation |
| `src/lib/prompts/promptLibrary.types.ts` | Created | LibraryCategory, CefrLevel, PromptDuration types |
| `src/lib/prompts/promptLibrary.ts` | Created | 28 curated prompts (7 per category) |
| `src/features/settings/useSettings.ts` | Created | Optimistic update hook with theme/phoneme side effects |
| `src/features/settings/SettingsPage/` | Created | 4-file component: profile, training, display, account, about sections |
| `src/app/(app)/settings/page.tsx` | Created | Server route with auth check |
| `src/features/prompts/LibraryPromptCard/` | Created | 3-file component with category badges + CEFR chip |
| `src/features/prompts/PromptLibraryView/` | Created | 3-file client component with category filter tabs |
| `src/features/prompts/PromptBanner/` | Created | 3-file presentational banner for recording page |
| `src/app/(app)/prompts/page.tsx` | Created | Server route with Container wrapper |
| `src/features/trends/trends.types.ts` | Created | TimeRange, TrendsState union, PillarTrendSeries |
| `src/features/trends/useTrends.ts` | Created | Fetch hook with AbortController + range state |
| `src/features/trends/PillarDeltaBadge/` | Created | 3-file component: green/amber/neutral (no red) |
| `src/features/trends/PillarTrendCard/` | Created | 4-file component with expand/collapse metric drill-down |
| `src/features/trends/TrendsPage/` | Created | 3-file component with time range picker + states |
| `src/app/(app)/trends/page.tsx` | Created | Server route with auth check |
| `src/components/ui/TrendChart/` | Created | 4-file SVG chart: ResizeObserver, hover tooltips, gradient fill |
| `src/components/ui/TopBar/TopBar.tsx` | Modified | Added gear icon link to /settings |
| `src/components/ui/MainNav/MainNav.tsx` | Modified | Added Prompts + Trends nav links |
| `src/app/(app)/session/new/page.tsx` | Modified | PromptBanner + promptUsed prop from searchParams |
| `src/features/recording/RecordingPanel/` | Modified | Added promptUsed prop threading |
| `src/features/recording/useSegmentUploader.ts` | Modified | Added promptUsed to FormData |
| `src/app/api/sessions/route.ts` | Modified | Added promptUsed to Zod schema + Prisma create |
| `src/lib/ai/analyze.ts` | Modified | PROMPT CONTEXT section in Claude analysis prompt |
| `src/lib/pipeline/executePipeline.ts` | Modified | Passes promptUsed to analyzeTranscript |

## Architecture Decisions
| Decision | Why |
|----------|-----|
| Shared Zod schemas in `lib/schemas/trends.ts` | Next.js route files cannot export non-handler symbols |
| DB-backed settings with `upsert` | Single source of truth; localStorage only for SSR fallback |
| 28 static prompts (no DB) | Curated quality over volume; no admin UI needed yet |
| `promptUsed` threaded to Claude | Analysis contextualizes feedback against the specific prompt |
| SVG chart (no chart library) | Lightweight, no dependency, matches existing sparkline pattern |
| eslint-disable for `set-state-in-effect` | Legitimate async fetch pattern in useTrends; no cleaner alternative |
| Green/amber/neutral delta badges | Gym convention — no red/error language for score changes |

## Testing Checklist
- [ ] `/settings` loads user preferences and saves on change
- [ ] Theme toggle updates both DB and local display
- [ ] `/prompts` shows 28 prompts with working category filter tabs
- [ ] "Start with this prompt" navigates to `/session/new?promptId=X`
- [ ] PromptBanner appears above recorder with correct prompt text
- [ ] Claude analysis includes PROMPT CONTEXT section when promptUsed is set
- [ ] `/trends` shows pillar trend charts with hover tooltips
- [ ] Time range selector (7d/30d/90d/all) filters data correctly
- [ ] PillarTrendCard expand shows per-metric drill-down
- [ ] Delta badges show correct green (up) / amber (down) / neutral colors
- [ ] Gear icon in TopBar links to settings
- [ ] MainNav shows Prompts + Trends links
- [x] `npx tsc --noEmit` — zero errors
- [x] `npm run build` — clean build
- [x] `npm run lint` — zero warnings

## Deployment Notes
- Run migration: `npx prisma migrate deploy` (new `UserSettings` table)
- No new env vars
- New routes: `/api/settings`, `/api/metrics/trends`
- New pages: `/settings`, `/prompts`, `/trends`

## Validation
```
npx tsc --noEmit → exit 0
npm run build → ✓ Compiled successfully
npm run lint → ✔ No ESLint warnings or errors
```
