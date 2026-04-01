# PR-0.19.0 — Production hardening
**Branch:** `feature/production-hardening` → `main`
**Version:** `0.19.0`
**Date:** 2026-04-01
**Status:** ✅ Ready to merge
---
## Summary
This change set improves production readiness: versioned database migrations, CI on pull requests, CSRF protection for session creation, broader accessibility coverage, removal of obsolete launch middleware, and clearer environment variable documentation with a verification script.

## Files Changed
| File | Action | Notes |
|------|--------|-------|
| `prisma/migrations/*` | Created | Baseline + drills table migration |
| `.github/workflows/ci.yml` | Created | tsc, lint, build |
| `src/lib/csrf.ts` | Created | `APP_URL` origin check |
| `src/app/api/sessions/route.ts` | Modified | CSRF on POST |
| Layout / landing / training / history UI | Modified | A11y |
| `src/middleware.ts` | Deleted | Launch allowlist |
| `.env.example`, `scripts/verify-env.ts` | Added/updated | Deploy checklist |
| `package.json` / lockfile | Modified | `tsx`, `verify-env` |

## Architecture Decisions
| Decision | Why |
|----------|-----|
| Origin check instead of CSRF tokens | Low overhead; same-site browsers send `Origin`; server callers omit it and remain compatible. |
| Two-step Prisma history | Live DB already had an init migration record but no repo file; baseline was reconciled, then drills added explicitly. |

## Testing Checklist
- [ ] `npx prisma migrate deploy` on staging/production applies pending migrations cleanly
- [ ] Sign-in → new session upload works in browser (Origin present)
- [ ] Tab order: skip link appears on first Tab on marketing and app shells
- [ ] `npm run verify-env` with production env exports exits 0

## Deployment Notes
- Run migrations before or with the release deploy.
- Ensure `APP_URL` matches the public site origin so CSRF checks match the browser.
- If an environment still shows “migration modified after applied” for the baseline, reconcile checksum only when the SQL file was intentionally updated to match that environment (avoid arbitrary edits).

## Validation
- `npx prisma migrate status` — database schema up to date  
- `npx tsc --noEmit`, `npm run lint`, `npm run build` — pass  
