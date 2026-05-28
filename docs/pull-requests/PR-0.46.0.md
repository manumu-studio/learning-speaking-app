# PR-0.46.0 — Observability Foundation
**Branch:** `feat/observability-foundation` → `main`
**Version:** `0.46.0`
**Date:** 2026-05-28
**Status:** ✅ Ready to merge
---
## Summary
- Sentry SDK integrated with graceful degradation when DSN is not configured
- Hand-rolled console logger replaced with Pino across 20 server-side files (38 call sites)
- Public `/api/health` endpoint for uptime monitoring and CI smoke tests
- Post-build CI step starts the app and verifies `/api/health` responds

## Files Changed
| File | Action | Notes |
|------|--------|-------|
| `sentry.*.config.ts` | Created | Client, server, edge Sentry init |
| `src/instrumentation.ts` | Created | Server startup + request error hook |
| `next.config.ts` | Modified | `withSentryConfig`, CSP connect-src |
| `src/lib/logger.ts` | Modified | Pino structured logger |
| `src/lib/env.ts` | Modified | Optional Sentry + LOG_LEVEL vars |
| `src/app/api/health/route.ts` | Created | DB check, version, uptime |
| `src/middleware.ts` | Modified | Health rate-limit exemption, CSP |
| `src/app/error.tsx` | Modified | Sentry.captureException |
| `src/app/(app)/error.tsx` | Modified | Sentry.captureException |
| `.github/workflows/ci.yml` | Modified | Smoke test after build |
| 20 API/lib files | Modified | Logger migration to Pino API |
| Test mocks | Modified | `{ logger }` mock shape |
| `package.json` | Modified | 0.46.0; `@sentry/nextjs`, `pino` |

## Architecture Decisions
| Decision | Why |
|----------|-----|
| Optional Sentry DSN in Zod schema | App must start in dev/CI without external services |
| Pino server-only (no client import) | Node-only; error boundaries use Sentry client SDK |
| Health endpoint public, no auth | Required for load balancers and external monitors |
| CI accepts HTTP 503 from health | No real DB in CI — verifies server boot, not DB connectivity |

## Testing Checklist
- [ ] `GET /api/health` returns 200 when DB is connected
- [ ] `GET /api/health` returns 503 when DB is down
- [ ] Server logs are JSON in production, pretty in development
- [ ] Error boundary triggers Sentry when DSN is configured
- [ ] CI smoke test passes on PR

## Deployment Notes
- Set `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` in production when Sentry project is ready
- Optional: `LOG_LEVEL=debug|info|warn|error` (defaults: info prod, debug dev)
- No database migration required

## Validation
```bash
npx tsc --noEmit && npm run lint && npm run test && npm run build
# All pass — 626 tests, 4 skipped
```
