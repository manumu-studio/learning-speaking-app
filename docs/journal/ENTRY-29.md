# ENTRY-29 — V5 Audit Remediation
**Date:** 2026-04-04
**Type:** Infrastructure
**Branch:** `feature/v5-audit-remediation`
**Version:** `0.29.0`

---

## What I Did

Addressed 11 findings from the V5 technical audit to push the codebase toward a 9.0/10 quality score. The work spans TypeScript safety (eliminating unsafe casts), performance optimization (query consolidation and caching), security hardening (environment-driven URLs), CI/CD improvements (action version fixes and Codecov), and error handling (root boundary).

Key changes:
- Replaced all `as string` casts in auth with Zod runtime validation
- Added Zod schemas for FormData boundaries and JSON database fields
- Consolidated dashboard from 12+ serial DB queries to a single parallelized batch
- Added `unstable_cache` with 60s TTL for dashboard data
- Extracted hardcoded auth URLs to `AUTH_ISSUER_URL` environment variable
- Fixed CI actions using non-existent v6 tags
- Added Codecov coverage reporting to CI pipeline
- Created root-level error boundary for unhandled errors

## Files Touched
| File | Action | Notes |
|------|--------|-------|
| .github/workflows/ci.yml | Modified | v6→v4, Codecov step |
| src/app/error.tsx | Created | Root error boundary |
| src/app/api/sessions/route.ts | Modified | Zod FormData validation |
| src/features/auth/auth.ts | Modified | OidcProfileSchema, env URLs |
| src/features/dashboard/getDashboardData.ts | Modified | Query consolidation + cache |
| src/lib/schemas/jsonFields.ts | Created | Shared JSON field schemas |
| src/middleware.ts | Modified | CSP from env var |
| src/lib/env.ts | Modified | AUTH_ISSUER_URL |
| README.md | Modified | CI + Codecov badges |
| vitest.config.ts | Modified | Coverage scope comment |
| package.json | Modified | v0.29.0 |

## Decisions

- **z.custom over z.instanceof for File**: `File` global doesn't exist in Node test environments, so `z.instanceof(File)` throws at module load time. `z.custom` with a runtime check works in both browser and test contexts.
- **Kept coverage scope as lib + features**: Adding `src/app/**` drops statement coverage from 71% to 50%. The 70/60/70/70 thresholds are a V5 audit achievement — better to preserve them and expand scope in a dedicated testing packet.
- **Client component auth URL exception**: CookieConsent.tsx has a display-only hardcoded URL. Server env vars can't be accessed in `'use client'` components without NEXT_PUBLIC_ prefix, and the URL is informational, not functional.

## Still Open

- Codecov token needs to be added as GitHub repo secret
- Coverage scope expansion to `src/app/` deferred (needs ~20 new tests)
- CookieConsent auth URL remains hardcoded (client component limitation)

## Validation

```
npx tsc --noEmit → 0 errors
npm run lint → 0 warnings
npm run test → 214 passed, 43 files
npm run test:coverage → 70.5% stmts, 76.9% branches, 89.4% funcs, 70.5% lines
npm run build → success, 102 kB shared JS
```
