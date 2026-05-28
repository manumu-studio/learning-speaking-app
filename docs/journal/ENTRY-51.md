# ENTRY-51 — Performance & Code Splitting
**Date:** 2026-05-28
**Type:** Infrastructure
**Branch:** `feat/performance-code-splitting`
**Version:** `0.47.0`
---
## What I Did
- Extracted HeroCanvas animation utilities into a dedicated module and lazy-loaded the landing page canvas via a client wrapper
- Added Suspense boundaries and route-level loading skeletons across dashboard, history, drills, drill detail, session detail, and new session routes
- Added private Cache-Control headers to all 8 read-only GET API routes with matching test coverage

## Files Touched
| File | Action | Notes |
|------|--------|-------|
| `src/components/ui/HeroCanvas/heroCanvasUtils.ts` | Created | FilmGrain, wave types, palette constants |
| `src/components/ui/HeroCanvas/HeroCanvasLazy.tsx` | Created | `next/dynamic` with `ssr: false` |
| `src/components/ui/HeroCanvas/HeroCanvas.tsx` | Modified | Slimmed to 258 lines |
| `src/app/(public)/page.tsx` | Modified | Uses lazy canvas |
| `src/app/(app)/**/page.tsx` (5 routes) | Modified | Suspense boundaries |
| `src/app/(app)/drill/[id]/loading.tsx` | Created | Dark route skeleton |
| `src/app/(app)/session/new/loading.tsx` | Created | Light/dark skeleton |
| `src/lib/api.ts` | Modified | Optional response headers |
| `src/app/api/**` (8 GET handlers) | Modified | Cache-Control TTLs |
| `src/app/api/**/route.test.ts` | Modified/Created | Header assertions |

## Decisions
- Client wrapper for HeroCanvas because Next.js 15 disallows `ssr: false` in Server Components — landing page stays an RSC
- List endpoints (`/api/sessions`, `/api/drills`) get `no-store`; detail and trend endpoints get short private max-age with stale-while-revalidate
- Suspense on session results is a route-transition boundary only — internal `useSessionStatus` loading UX unchanged

## Still Open
- Manual DevTools check that HeroCanvas loads in a separate chunk on first landing visit

## Validation
```
npx tsc --noEmit → exit 0
npm run lint → ✔ No ESLint warnings or errors
npm run test → 634 passed | 4 skipped
npm run build → ✓ Compiled successfully
```
