# ENTRY-20 — Security Hardening
**Date:** 2026-04-01
**Type:** Security
**Branch:** `feature/security-hardening`
**Version:** `0.20.0`
---
## What I Did
- Extended CSRF protection to three unprotected state-mutating endpoints: drill creation, drill completion, and session deletion. All four custom POST/DELETE handlers are now covered.
- Moved API rate limiting from per-route inline checks into Next.js middleware so every `/api/*` route (except `/api/auth/*`) is rate-limited automatically. Removed the duplicate inline limiter from the sessions endpoint.
- Created a prompt input sanitiser that escapes backticks, quotes, angle brackets, curly braces, and fake role-marker patterns (`SYSTEM:`, `HUMAN:`, `ASSISTANT:`, `USER:`). Applied it to all user-derived strings in `generateDrill` and `evaluateDrill` before they enter Claude prompts.
- Rate limiter uses verified `externalId` from the auth session as key for authenticated users, falling back to `x-forwarded-for` IP for unauthenticated requests.
- Redis failures fail open so the app stays available when Upstash is unreachable.

## Files Touched
| File | Action | Notes |
|------|--------|-------|
| `src/middleware.ts` | Added | Auth + sliding-window rate limiter for `/api/*` |
| `src/lib/sanitizePromptInput.ts` | Added | Prompt injection sanitiser |
| `src/lib/rateLimit.ts` | Changed | Renamed to `getRateLimiter`, configurable limits, fail-open |
| `src/lib/env.ts` | Changed | `API_RATE_LIMIT_*` optional env vars |
| `src/app/api/drills/route.ts` | Changed | CSRF check on POST |
| `src/app/api/drills/[id]/complete/route.ts` | Changed | CSRF check on POST |
| `src/app/api/sessions/[id]/route.ts` | Changed | CSRF check on DELETE |
| `src/app/api/sessions/route.ts` | Changed | Removed inline rate limiter |
| `src/features/training/generateDrill.ts` | Changed | Sanitise user fields before prompt |
| `src/features/training/evaluateDrill.ts` | Changed | Sanitise user fields before prompt |
| `.env.example` | Changed | Rate-limit env var documentation |
| `package.json` | Changed | `0.20.0` |

## Decisions
- Kept CSRF exemptions for NextAuth (own CSRF), QStash webhook (HMAC signature), dev-only endpoint (NODE_ENV guard), and the dead launch endpoint.
- Default rate limit set to 60 requests per minute (tunable via env) — high enough for normal drill/dashboard traffic but catches abuse.
- `@upstash/redis/cloudflare` import keeps middleware compatible with the Edge runtime.

## Still Open
- None in packet scope. Broader V3 audit items tracked separately.

## Validation
```bash
npx tsc --noEmit   # pass
npm run lint       # no warnings or errors
npm run test       # 7 tests passed
npm run build      # success (Next.js 15.5.12)
```
All completed successfully on 2026-04-01.
