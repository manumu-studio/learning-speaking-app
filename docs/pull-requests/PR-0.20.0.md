# PR-0.20.0 — Security hardening
**Branch:** `feature/security-hardening` → `main`
**Version:** `0.20.0`
**Date:** 2026-04-01
**Status:** ✅ Ready to merge
---
## Summary
This release tightens cross-origin protection on state-changing APIs, applies a single middleware-level rate limit across non-authentication API routes, and sanitises user text before it is interpolated into drill-related AI prompts.

## Files Changed (table: File | Action | Notes)
| File | Action | Notes |
|------|--------|-------|
| `package.json` | Updated | 0.20.0 |
| `src/lib/rateLimit.ts` | Updated | `getRateLimiter`, `lsa:api`, Edge Redis import |
| `src/lib/sanitizePromptInput.ts` | Added | Prompt injection hardening |
| `src/middleware.ts` | Added | Rate limit `/api/*` except `/api/auth/*` |
| `src/app/api/sessions/route.ts` | Updated | No per-route limiter |
| `src/app/api/sessions/[id]/route.ts` | Updated | CSRF on DELETE |
| `src/app/api/drills/route.ts` | Updated | CSRF on POST |
| `src/app/api/drills/[id]/complete/route.ts` | Updated | CSRF on POST |
| `src/features/training/generateDrill.ts` | Updated | Sanitised user-derived fields |
| `src/features/training/evaluateDrill.ts` | Updated | Sanitised user transcript and example |

## Architecture Decisions (table: Decision | Why)
| Decision | Why |
|----------|-----|
| Middleware rate limiting | One place covers every API route instead of remembering per-handler limits. |
| `@upstash/redis/cloudflare` | Keeps middleware Edge-safe and removes Node-only API warnings at build time. |
| Minimal string sanitiser | Easy to audit; blocks obvious delimiter and fake-role patterns in user text. |

## Testing Checklist (checkboxes)
- [x] Typecheck passes
- [x] Lint passes
- [x] Unit tests pass
- [x] Production build succeeds
- [ ] Manual: confirm drill create/complete and session delete from the app still work (same-origin)
- [ ] Manual: confirm 429 appears after burst traffic when Redis is configured (optional)

## Deployment Notes
- No new environment variables. Ensure `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` remain set in production if rate limiting should be active; when unset, middleware skips limiting (unchanged behaviour from optional Redis).

## Validation (commands + results)
```text
npx tsc --noEmit — pass
npm run lint — pass
npm run test — 7 passed
npm run build — pass
```
