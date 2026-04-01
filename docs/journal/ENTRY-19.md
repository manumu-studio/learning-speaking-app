# ENTRY-19 — Production hardening
**Date:** 2026-04-01
**Type:** Infrastructure
**Branch:** `feature/production-hardening`
**Version:** `0.19.0`
---
## What I Did
- Committed a full Prisma migration baseline aligned with production, plus a migration adding the drills table where the live database had fallen behind the schema.
- Added a CI workflow on GitHub Actions (typecheck, lint, build, Prisma generate) for pushes and pull requests to `main`.
- Introduced an origin-based CSRF guard on `POST /api/sessions` using the validated `APP_URL` setting.
- Improved accessibility: skip link, main landmark id, section labels, navigation and sign-out naming, live regions for loading/recording/processing, and clearer list semantics on history.
- Removed Next.js middleware that only existed for a time-boxed launch allowlist; auth continues to run in the protected app layout.
- Expanded `.env.example` and added a small `verify-env` script (via `tsx`) for pre-deploy checks.

## Files Touched
| File | Action | Notes |
|------|--------|-------|
| `prisma/migrations/*` | Created/updated | Baseline + `drill_attempts` |
| `.github/workflows/ci.yml` | Created | Node 20, no secrets in build |
| `src/lib/csrf.ts` | Created | Origin validation |
| `src/app/api/sessions/route.ts` | Modified | CSRF after auth |
| Multiple UI/layout files | Modified | A11y |
| `src/middleware.ts` | Deleted | Launch gate removed |
| `.env.example`, `scripts/verify-env.ts` | Created/updated | Env documentation |
| `package.json` | Modified | `verify-env`, `tsx` |

## Decisions
- **Checksum update on Neon:** After replacing the baseline migration file to match the real database, the stored migration checksum had to be updated once so `prisma migrate dev` stays usable without resetting data.
- **CSRF only on session create:** Matches the agreed scope; webhooks and other routes keep their own auth/signature rules.

## Still Open
- Optional: wire `verify-env` into CI with a dedicated non-secret fixture env if we want the script to run on every PR without loading real secrets.

## Validation
- `npx prisma migrate status` — up to date  
- `npx prisma migrate dev` — already in sync  
- `npx tsc --noEmit`, `npm run lint`, `npm run build` — pass  
