# PR-0.29.0 — V5 Audit Remediation
**Branch:** `feature/v5-audit-remediation` → `main`
**Version:** `0.29.0`
**Date:** 2026-04-04
**Status:** ✅ Ready to merge

---

## Summary

Addresses 11 findings from the V5 technical audit. Eliminates unsafe TypeScript casts with Zod validation, consolidates dashboard queries for performance, adds caching, extracts hardcoded URLs to environment config, fixes CI action versions, integrates Codecov, and adds a root error boundary.

## Files Changed
| File | Action | Notes |
|------|--------|-------|
| .github/workflows/ci.yml | Modified | Fix v6→v4 actions, add Codecov |
| src/app/error.tsx | Created | Root error boundary |
| src/app/api/sessions/route.ts | Modified | Zod FormData validation |
| src/features/auth/auth.ts | Modified | Zod OIDC profile + env URLs |
| src/features/dashboard/getDashboardData.ts | Modified | Query consolidation + cache |
| src/lib/schemas/jsonFields.ts | Created | Shared JSON field schemas |
| src/lib/env.ts | Modified | AUTH_ISSUER_URL |
| src/middleware.ts | Modified | CSP from env var |
| README.md | Modified | CI + Codecov badges |
| .env.example | Modified | AUTH_ISSUER_URL |
| vitest.config.ts | Modified | Coverage scope comment |
| package.json | Modified | v0.29.0 |
| + 4 updated consuming files | Modified | Zod safeParse for JSON fields |
| + 3 test files | Modified | Mock updates for new patterns |

## Architecture Decisions
| Decision | Why |
|----------|-----|
| z.custom for File validation | z.instanceof(File) fails in Node test env |
| unstable_cache with 60s TTL | Reduces dashboard DB load without stale data risk |
| AUTH_ISSUER_URL env var | Eliminates hardcoded auth URLs across 4 files |
| Coverage scope unchanged | Expanding to src/app/ drops below 70% thresholds |

## Testing Checklist
- [x] `npx tsc --noEmit` — zero type errors
- [x] `npm run lint` — zero warnings
- [x] `npm run test` — 214 tests pass
- [x] `npm run test:coverage` — all thresholds met (70.5/76.9/89.4/70.5)
- [x] `npm run build` — clean build, 102 kB shared JS
- [x] No `any` types in changed files
- [x] No hardcoded auth URLs in src/ (except client display link)
- [x] No `@v6` action references in CI

## Deployment Notes
- **New env var:** `AUTH_ISSUER_URL` — defaults to `https://auth.manumustudio.com`, set on Vercel if using a different auth server
- **GitHub secret:** Add `CODECOV_TOKEN` to repo settings for coverage reporting (CI won't fail without it)
- No database migrations required
- No breaking API changes

## Validation
```
npx tsc --noEmit → 0 errors
npm run lint → 0 warnings  
npm run test → 214 passed (43 files)
npm run test:coverage → 70.5/76.9/89.4/70.5
npm run build → ✅ 102 kB shared JS
```
