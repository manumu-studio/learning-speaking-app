# PR-0.54.0 — Observability Hardening
**Branch:** `feat/observability-hardening` → `main`
**Version:** `0.54.0`
**Date:** 2026-05-31
**Status:** ✅ Ready to merge
---
## Summary
Full observability layer for all API routes — request ID correlation, structured logging, Sentry error capture, pipeline duration tracking, and source map upload. Every non-health/auth/dev route is now wrapped with `withObservability`.

## Files Changed
| File | Action | Notes |
|------|--------|-------|
| `src/lib/observability/requestId.ts` | Created | AsyncLocalStorage-based request ID correlation |
| `src/lib/observability/sentryContext.ts` | Created | Sets Sentry user/session/request tags |
| `src/lib/observability/withObservability.ts` | Created | Standardized route wrapper — logging, error capture, request tracing |
| `src/lib/observability/pipelineMetrics.ts` | Created | Pipeline stage duration tracking + Sentry breadcrumbs |
| `src/lib/observability/index.ts` | Created | Barrel export |
| `src/lib/observability/__tests__/*.ts` | Created | 11 unit tests for requestId + withObservability |
| `src/app/api/internal/*/route.ts` (6 files) | Modified | Wrapped with withObservability |
| `src/app/api/sessions/**/route.ts` (8 files) | Modified | Wrapped with withObservability |
| `src/app/api/*/route.ts` (15 files) | Modified | Wrapped with withObservability |
| `src/lib/pipeline/executePipeline.ts` | Modified | logPipelineStage calls for transcribe/score/analyze |
| `src/lib/pipeline/processChunk.ts` | Modified | logPipelineStage call |
| `src/lib/pipeline/processFinal.ts` | Modified | logPipelineStage call |
| `src/app/api/health/route.ts` | Modified | Dynamic version + R2/QStash checks |
| `next.config.ts` | Modified | Conditional Sentry source maps + hideSourceMaps |
| `src/lib/env.ts` | Modified | SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT, APP_VERSION |
| `.env.example` | Modified | New Sentry vars documented |
| `eslint.config.mjs` | Modified | argsIgnorePattern for underscore-prefixed params |
| `e2e/*.spec.ts` (4 files) | Modified | Hardened timeouts for pre-push stability |
| `package.json` | Modified | Version bump to 0.54.0 |

## Architecture Decisions
| Decision | Why |
|----------|-----|
| `withObservability` wrapper pattern | Single point for request ID, logging, Sentry context, error capture — avoids duplicating in 29 routes |
| AsyncLocalStorage for request ID | Propagates ID through async chains without explicit threading |
| Config-presence health checks (not live probes) | Avoids side effects on health probes; R2/QStash being misconfigured is caught by other monitoring |
| Conditional source maps via SENTRY_AUTH_TOKEN | Local/CI builds skip upload; production gets real stack traces |
| `argsIgnorePattern: "^_"` in ESLint | Standard TS convention — avoids lint noise on intentionally unused callback params |

## Testing Checklist
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes
- [ ] `npm run lint` — 0 warnings
- [ ] `npm test` — 850+ passing, 0 failing
- [ ] `/api/health` returns dynamic version, R2/QStash check fields
- [ ] Throw in any API route — error appears in Sentry with requestId + userId tags
- [ ] Pipeline logs show `pipeline.stage` events with durationMs

## Deployment Notes
- No migrations required
- Set `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` in Vercel for source map upload
- `APP_VERSION` is auto-injected at build time from package.json — no env var needed

## Validation
```
npx tsc --noEmit — pass
npm run build — pass
npm run lint — 0 warnings, 0 errors
npm test — 850 passing, 4 skipped
npx playwright test — 33 passed, 1 skipped
```
