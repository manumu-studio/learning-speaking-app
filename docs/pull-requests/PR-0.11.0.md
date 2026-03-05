# PR-0.11.0 — fix(auth): route signup link through OAuth flow, fix docs branch refs

**Branch:** `feature/landing-page-signin` → `main`
**Version:** `0.11.0`
**Date:** 2026-03-05
**Status:** ✅ Ready to merge

---

## Summary

This update removes the redundant `/auth/signin` intermediate step and moves sign-in directly into the landing page. It also adds a persistent cookie consent banner with clear disclosure that authentication is handled by ManuMu Studio Auth.

**Fixes in this PR:** (1) Signup link ("Create one here") now routes correctly through OAuth with `mode: 'signup'`; semantic HTML fix — signup form moved out of `<p>` into `<div>` to avoid invalid nesting and hydration issues. (2) Docs branch/version references updated for consistency.

---

## What Was Built

### Authentication Flow Simplification

| File | Purpose |
|---|---|
| `src/app/(public)/page.tsx` | Landing page auth CTA form (`signIn`) + error surface; signup link in valid `<div>` (OAuth `mode: 'signup'`) |
| `src/features/auth/auth.ts` | NextAuth `pages.signIn` changed to `/` |
| `src/app/(app)/layout.tsx` | Protected app routes now redirect unauthenticated users to `/` |
| `src/app/auth/signin/page.tsx` | Removed obsolete page |

### Cookie Consent Banner (4-file pattern)

| File | Purpose |
|---|---|
| `src/components/ui/CookieConsent/CookieConsent.tsx` | Banner UI and accept interaction |
| `src/components/ui/CookieConsent/useCookieConsent.ts` | Client hook to read/write consent from `localStorage` |
| `src/components/ui/CookieConsent/CookieConsent.types.ts` | `CookieConsentProps` interface |
| `src/components/ui/CookieConsent/index.ts` | Barrel export |

### Documentation Updates

| File | Purpose |
|---|---|
| `docs/journal/ENTRY-11.md` | Journal entry for TASK-025/TASK-026 |
| `docs/roadmap/ROADMAP.md` | Roadmap status updated with UX/compliance milestone |
| `README.md` | Added recent updates for sign-in flow and consent |
| `docs/README.md` | Build-system guide updated with current documentation set |

---

## Architecture Decisions

| Decision | Rationale |
|---|---|
| Server-action sign-in in landing page | Keeps auth trigger server-side and avoids a throwaway client-only route |
| Keep auth errors on `/` via query param | Faster user recovery and fewer navigation steps |
| Consent persistence via `localStorage` | Appropriate for UI preference state with no server dependency |
| Null-first consent state | Prevents banner flicker on first paint for returning accepted users |
| Keep consent non-blocking | Preserves landing page usability while still displaying required disclosure |

---

## Validation

```bash
npx tsc --noEmit   # ✅ zero errors
npm run build      # ✅ clean build
npm run lint       # ✅ no lint violations
```

---

## Testing Checklist

- [x] Landing page shows sign-in form + signup link (OAuth `mode: 'signup'`) when unauthenticated
- [x] Landing page shows "Go to Dashboard" when authenticated
- [x] Auth errors render on landing page via `?error=...`
- [x] `/auth/signin` is removed
- [x] Protected routes redirect unauthenticated users to `/`
- [x] Cookie banner appears on first visit
- [x] Clicking "Accept" stores consent and hides the banner
- [x] Banner stays hidden across refresh/navigation after acceptance
- [x] Full quality gates pass (`tsc`, `build`, `lint`)
