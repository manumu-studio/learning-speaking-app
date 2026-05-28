# ENTRY-50 — Observability Foundation
**Date:** 2026-05-28
**Type:** Infrastructure
**Branch:** `feat/observability-foundation`
**Version:** `0.46.0`
---
## What I Did

Added production observability across four pillars: Sentry error tracking (graceful when DSN is absent), Pino structured logging replacing the hand-rolled console wrapper, a public `/api/health` endpoint with database connectivity checks, and a CI smoke test that verifies the built app serves traffic.

## Files Touched

| File | Action | Notes |
|------|--------|-------|
| `sentry.client.config.ts` | Created | Browser Sentry init |
| `sentry.server.config.ts` | Created | Node Sentry init |
| `sentry.edge.config.ts` | Created | Edge Sentry init |
| `src/instrumentation.ts` | Created | Next.js hook + `onRequestError` |
| `next.config.ts` | Modified | `withSentryConfig`, CSP for Sentry ingest |
| `src/lib/logger.ts` | Modified | Pino logger (JSON prod, pretty dev) |
| `src/lib/env.ts` | Modified | `SENTRY_DSN`, `LOG_LEVEL` optional vars |
| `src/app/api/health/route.ts` | Created | Public health endpoint |
| `src/middleware.ts` | Modified | Health excluded from rate limit; CSP |
| `src/app/error.tsx` | Modified | Sentry capture in root boundary |
| `src/app/(app)/error.tsx` | Modified | Sentry capture in app boundary |
| `.github/workflows/ci.yml` | Modified | Post-build health smoke test |
| 20 API/lib files | Modified | Migrated `log()` → `logger.info/warn/error()` |
| `package.json` | Modified | Version 0.46.0; Sentry + Pino deps |

## Decisions

- Sentry source map upload disabled for now (`sourcemaps: { disable: true }`) — can enable when org/project tokens are configured
- Health endpoint returns 503 when DB is unreachable but still responds — CI accepts 200 or 503 as proof the server starts
- Pino `err` key used for error serialization per Pino convention

## Still Open

- Configure `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` in production when Sentry project is ready
- Sentry recommends adding `global-error.js` for App Router render errors (build warning only)

## Validation

```bash
npx tsc --noEmit && npm run lint && npm run test && npm run build
# tsc: pass | lint: pass | test: 626 passed, 4 skipped | build: pass
```
