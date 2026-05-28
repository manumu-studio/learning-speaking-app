# ENTRY-47 — Settings + Prompt Library + History Trends
**Date:** 2026-05-28
**Type:** Feature
**Branch:** `feat/settings-prompts-trends`
**Version:** `0.43.0`
---
## What I Did
Built three features on a single branch:

1. **User Settings** — Full `/settings` page with DB-backed `UserSettings` model (Prisma migration), GET/PATCH API with Zod validation, `useSettings` hook with optimistic updates, 5-section settings UI (Profile, Training, Display, Account, About), gear icon in TopBar.

2. **Prompt Library** — `/prompts` page with 28 curated speaking prompts (7 per category: Professional, Academic, Social, Creative), category filter tabs, "Start with this prompt" CTA linking to `/session/new?promptId=X`. `promptUsed` field threaded through recording → upload → sessions API → analysis (PROMPT CONTEXT section).

3. **History Trends** — `/trends` page with SVG `TrendChart` (ResizeObserver + hover tooltips + gradient fill), pillar trend cards with expandable metric drill-down, `PillarDeltaBadge` (green/amber/neutral), time range selector (7d/30d/90d/all), `useTrends` fetch hook with AbortController.

## Files Touched
| File | Action | Notes |
|------|--------|-------|
| `prisma/schema.prisma` | Modified | UserSettings model + User relation |
| `prisma/migrations/20260527235318_add_user_settings/` | Created | Migration SQL |
| `src/lib/schemas/trends.ts` | Created | Shared Zod schemas (extracted from route) |
| `src/app/api/settings/route.ts` | Created | GET/PATCH with upsert |
| `src/app/api/metrics/trends/route.ts` | Created | Time-series pillar aggregation |
| `src/lib/prompts/promptLibrary.ts` + `.types.ts` | Created | 28 prompts + types |
| `src/features/settings/**` | Created | useSettings + SettingsPage |
| `src/features/prompts/**` | Created | LibraryPromptCard, PromptLibraryView, PromptBanner |
| `src/features/trends/**` | Created | useTrends, PillarDeltaBadge, PillarTrendCard, TrendsPage |
| `src/components/ui/TrendChart/` | Created | SVG chart component |
| `src/components/ui/TopBar/TopBar.tsx` | Modified | Gear icon link |
| `src/components/ui/MainNav/MainNav.tsx` | Modified | Prompts + Trends nav links |
| `src/app/(app)/session/new/page.tsx` | Modified | PromptBanner + promptUsed |
| `src/features/recording/**` | Modified | promptUsed prop threading |
| `src/app/api/sessions/route.ts` | Modified | promptUsed in schema + create |
| `src/lib/ai/analyze.ts` | Modified | PROMPT CONTEXT in analysis prompt |
| `src/lib/pipeline/executePipeline.ts` | Modified | Passes promptUsed downstream |

## Decisions
- **Shared Zod schemas** — Next.js route files can't export non-handler symbols, so `TrendsResponseSchema` etc. live in `src/lib/schemas/trends.ts`
- **Static prompt library** — 28 curated prompts in code rather than DB; quality over quantity, no admin UI overhead
- **SVG over chart library** — Matches existing sparkline pattern, zero new dependencies
- **No red in delta badges** — Gym convention: amber for decline, green for growth, neutral for flat
- **eslint-disable for set-state-in-effect** — Legitimate async fetch pattern in `useTrends.ts`; restructured to async function inside effect with `void load()` call

## Still Open
- `npm test` not run against this branch yet
- Package.json version not bumped to 0.43.0

## Validation
```
npx tsc --noEmit → exit 0
npm run build → ✓ Compiled successfully
npm run lint → ✔ No ESLint warnings or errors
```
