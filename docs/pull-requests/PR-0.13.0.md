# PR-0.13.0 — Polish, Rate Limiting & Production Readiness
**Branch:** `feauture/polish` → `main`
**Version:** `0.13.0`
**Date:** 2026-03-31
**Status:** ✅ Ready to merge

---

## Summary

Production hardening pass adding rate limiting, structured logging, error boundaries, loading UI, a reusable SubmitButton with loading states, SEO metadata, faster theme transitions, and a full codebase audit.

## Files Changed

| File | Action | Notes |
|------|--------|-------|
| `package.json` / `package-lock.json` | Modified | @upstash/ratelimit, @upstash/redis |
| `src/lib/env.ts` | Modified | Redis env vars (optional) |
| `src/lib/rateLimit.ts` | Created | Sliding window rate limiter (5/hr) |
| `src/lib/logger.ts` | Created | Structured JSON logging |
| `src/app/api/sessions/route.ts` | Modified | Rate limiting + logging |
| `src/app/api/sessions/[id]/route.ts` | Modified | Structured logging |
| `src/app/api/internal/process/route.ts` | Modified | Pipeline step logging + timing |
| `src/lib/queue/qstash.ts` | Modified | Structured logging |
| `src/components/ui/ErrorBoundary/*` | Created | Error boundary (3 files) |
| `src/components/ui/LoadingSpinner/*` | Created | Spinner component (3 files) |
| `src/app/(app)/layout.tsx` | Modified | ErrorBoundary wrapping |
| `src/app/layout.tsx` | Modified | OpenGraph metadata |
| `src/app/robots.ts` | Created | SEO robots.txt |
| `src/features/session/SessionCardSkeleton.tsx` | Created | Loading skeleton |
| `src/features/insights/InsightCardSkeleton.tsx` | Created | Loading skeleton |
| `src/components/ui/SubmitButton/*` | Created | Form submit button with spinner (3 files) |
| `src/app/(public)/page.tsx` | Modified | Sign-in buttons use SubmitButton |
| `src/components/landing/CtaFooter/CtaFooter.tsx` | Modified | CTA button uses SubmitButton |
| `src/app/api/dev/process/route.ts` | Modified | Replaced console.* with structured logging |
| `src/app/(public)/launch/launch.module.css` | Modified | Faster theme transition (0.5s → 0.15s) |
| `src/app/(public)/explanation/explanation.module.css` | Modified | Faster theme transition (0.5s → 0.15s) |
| 3 barrel `index.ts` files | Modified | Added header comments |

## Architecture Decisions

| Decision | Why |
|----------|-----|
| Optional rate limiting | Graceful degradation — dev works without Upstash credentials |
| Structured JSON logging | Future-proof for monitoring services (Datadog, Sentry, etc.) |
| Class-based ErrorBoundary | React requirement — only mechanism for catching render errors |
| robots.txt via Next.js route | Type-safe, co-located with app routes |
| SubmitButton with useFormStatus | Automatic pending state from form context — no manual state management |
| Theme transition 0.5s → 0.15s | Snappy feel without jarring flash |

## Testing Checklist

- [x] `npx tsc --noEmit` passes (0 errors)
- [x] `npm run build` succeeds (15/15 pages)
- [x] `npm run lint` passes (0 warnings)
- [ ] Rate limiting returns 429 after 5 sessions/hour (requires Upstash credentials)
- [ ] ErrorBoundary catches render errors gracefully
- [ ] Loading skeletons render during fetches
- [x] No `console.log` in any code (all routes use structured logger)
- [x] All API routes validate auth
- [x] All Prisma queries scoped to userId
- [x] All files have header comments
- [x] robots.txt blocks /api/ and /session/

## Deployment Notes

New optional environment variables needed for rate limiting:
- `UPSTASH_REDIS_REST_URL` — Upstash Redis REST endpoint
- `UPSTASH_REDIS_REST_TOKEN` — Upstash Redis auth token

Rate limiting works without these (silently skipped), but should be configured in production.

## Validation

```
$ npx tsc --noEmit → 0 errors
$ npm run build → ✓ Compiled successfully
$ npm run lint → ✔ No warnings or errors
```
