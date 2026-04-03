# PR-0.26.0 — E2E and component testing

**Branch:** `feature/testing-e2e-components` → `main`
**Version:** `0.26.0`
**Date:** 2026-04-03
**Status:** Ready to merge

---

## Summary

This release completes the browser and component testing layer: Playwright covers critical user journeys, Vitest with React Testing Library covers selected interactive UI, and CI runs E2E after the existing typecheck/lint/unit/build job. A guarded test-only auth shortcut allows protected pages to load in automation without weakening production security.

## Files Changed

| File | Action | Notes |
|------|--------|-------|
| `e2e/` | Added | Specs + fixture |
| `playwright.config.ts` | Added | Chromium, webServer |
| `src/features/auth/auth.ts`, `src/middleware.ts` | Modified | E2E-only bypass |
| `src/**/*.test.tsx` (4 areas) | Added | Component tests |
| `vitest.config.ts`, `src/__mocks__/rtl-setup.ts` | Added/Modified | jsdom + RTL |
| `.github/workflows/ci.yml` | Modified | `e2e` job |
| `package.json`, `README.md` | Modified | Deps, scripts, version, docs |

## Architecture Decisions

| Decision | Why |
|----------|-----|
| Environment-gated synthetic session | Unblocks dashboard/history E2E while keeping OAuth for real users |
| Separate CI job for Playwright | Keeps install/browser steps out of the fast check job; fails fast after unit tests |

## Testing Checklist

- [x] `npx tsc --noEmit`
- [x] `npm run lint`
- [x] `npm run test`
- [x] `npm run test:coverage`
- [ ] `npm run build` (verify on CI or Node 20 locally)
- [ ] `npm run test:e2e` (verify on CI or Node 20 locally)

## Deployment Notes

No database migrations. Ensure production never sets `E2E_TEST_USER`. CI already passes stub env vars for build and test jobs.

## Validation

Commands run locally (agent environment):

```
npx tsc --noEmit
npm run lint
npm run test
npm run test:coverage
```

All succeeded. Full production build and Playwright were not run locally due to toolchain constraints; validate on CI or with Node 20.
