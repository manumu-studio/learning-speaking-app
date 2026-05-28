# PR-0.47.0 — Performance & Code Splitting
**Branch:** `feat/performance-code-splitting` → `main`
**Version:** `0.47.0`
**Date:** 2026-05-28
**Status:** ✅ Ready to merge
---
## Summary
Improves perceived performance and browser caching: lazy-loaded landing canvas, Suspense boundaries on key app routes, missing route skeletons, and Cache-Control headers on authenticated GET APIs.

## Files Changed
| File | Action | Notes |
|------|--------|-------|
| `src/components/ui/HeroCanvas/*` | Modified/Created | Utils extraction + lazy wrapper |
| `src/app/(public)/page.tsx` | Modified | Deferred canvas JS |
| `src/app/(app)/**` | Modified/Created | Suspense + loading.tsx |
| `src/lib/api.ts` | Modified | Optional response headers |
| `src/app/api/**` | Modified/Created | Cache-Control + tests |
| `package.json` | Modified | 0.47.0 |

## Architecture Decisions
| Decision | Why |
|----------|-----|
| HeroCanvasLazy client component | Server Components cannot use `ssr: false` with `next/dynamic` |
| `private, no-store` on list APIs | Session/drill lists change on every upload |
| Short max-age + SWR on detail APIs | Immutable once complete; reduces repeat fetches on navigation |
| Suspense without replacing hooks | Route transitions stream; existing data-loading UX preserved |

## Testing Checklist
- [ ] Landing page loads with black skeleton then animated canvas
- [ ] Dashboard/drills/history show pulse skeletons during navigation
- [ ] Drill detail and session detail show route skeletons
- [ ] GET `/api/dashboard` returns `Cache-Control: private, max-age=30, stale-while-revalidate=60`
- [ ] GET `/api/sessions` returns `Cache-Control: private, no-store`
- [ ] All 634 unit tests pass

## Deployment Notes
No migrations or env changes. Safe to deploy as a frontend + API header-only release.

## Validation
```
npx tsc --noEmit → exit 0
npm run lint → ✔ No ESLint warnings or errors
npm run test → 634 passed | 4 skipped
npm run build → ✓ Compiled successfully
```
