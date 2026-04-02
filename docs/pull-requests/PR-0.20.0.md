# PR-0.20.0 — Security Hardening
**Branch:** `feature/security-hardening` → `main`
**Version:** `0.20.0`
**Date:** 2026-04-01
**Status:** ✅ Ready to merge
---
## Summary
This release closes three security gaps flagged in the V3 audit: extends CSRF protection to all state-mutating API endpoints, moves rate limiting into middleware for blanket API coverage, and adds prompt input sanitisation to prevent injection attacks on Claude-powered drill generation and evaluation.

## Files Changed
| File | Action | Notes |
|------|--------|-------|
| `src/middleware.ts` | Added | Edge-compatible rate limiter for all `/api/*` except auth |
| `src/lib/sanitizePromptInput.ts` | Added | Escapes backticks, quotes, brackets, role markers |
| `src/lib/rateLimit.ts` | Changed | `getRateLimiter` with env-tunable limits, fail-open |
| `src/lib/env.ts` | Changed | Optional `API_RATE_LIMIT_*` vars |
| `src/app/api/drills/route.ts` | Changed | CSRF on POST |
| `src/app/api/drills/[id]/complete/route.ts` | Changed | CSRF on POST |
| `src/app/api/sessions/[id]/route.ts` | Changed | CSRF on DELETE |
| `src/app/api/sessions/route.ts` | Changed | Inline rate limiter removed |
| `src/features/training/generateDrill.ts` | Changed | Sanitised user inputs |
| `src/features/training/evaluateDrill.ts` | Changed | Sanitised user inputs |
| `.env.example` | Changed | Rate-limit env docs |
| `package.json` | Changed | Version `0.20.0` |

## Architecture Decisions
| Decision | Why |
|----------|-----|
| Middleware-level rate limiting | One limiter covers all API routes; no per-handler duplication |
| `externalId` as rate-limit key | Verified from auth session — cannot be spoofed like IP |
| Fail-open on Redis errors | Availability over strictness; logging captures failures |
| Sanitiser as standalone util | Auditable, testable, single-purpose module |
| CSRF exemptions for auth/QStash/dev | Each has its own verification mechanism |

## Testing Checklist
- [x] `npx tsc --noEmit`
- [x] `npm run lint`
- [x] `npm run test`
- [x] `npm run build`
- [ ] Manual: verify CSRF rejection on drill/session endpoints without Origin header
- [ ] Manual: verify rate limit 429 response after exceeding threshold
- [ ] Manual: verify prompt sanitisation strips role markers from drill output

## Deployment Notes
No database migrations. Optionally set `API_RATE_LIMIT_REQUESTS` and `API_RATE_LIMIT_WINDOW` on Vercel to tune rate limiting (defaults: 60 requests per 1 minute). Upstash Redis env vars must already be configured.

## Validation
```bash
npx tsc --noEmit   # pass
npm run lint       # no warnings or errors
npm run test       # 7 tests passed
npm run build      # success (Next.js 15.5.12)
```
Run on 2026-04-01 on `feature/security-hardening`.
