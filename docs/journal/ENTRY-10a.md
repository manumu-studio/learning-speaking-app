# ENTRY-10a — Landing Sign-In Merge + Cookie Consent (TASK-025/TASK-026)

**Date:** 2026-03-02
**Type:** UX + Compliance
**Branch:** `feature/landing-page-signin`
**Version:** `0.8.4` (planned)

---

## What I Did

Removed the redundant intermediate sign-in page and merged authentication entry directly into the public landing page (`/`). Added a persistent cookie consent banner that explains session cookie usage and third-party authentication handling.

The result is a shorter auth journey (one fewer hop) and explicit consent messaging for users before they begin.

---

## Files Touched

| File | Action | Notes |
|---|---|---|
| `src/app/(public)/page.tsx` | Modified | Added server-action sign-in form, auth error handling, signup link, and cookie banner mount |
| `src/features/auth/auth.ts` | Modified | Updated NextAuth `pages.signIn` to `/` |
| `src/app/(app)/layout.tsx` | Modified | Redirects unauthenticated users to `/` |
| `src/app/auth/signin/page.tsx` | Deleted | Removed redundant intermediate sign-in page |
| `src/components/ui/CookieConsent/CookieConsent.tsx` | Created | Fixed bottom consent banner with auth-provider disclosure |
| `src/components/ui/CookieConsent/useCookieConsent.ts` | Created | localStorage-backed acceptance state with no-flash initialization |
| `src/components/ui/CookieConsent/CookieConsent.types.ts` | Created | Component props interface |
| `src/components/ui/CookieConsent/index.ts` | Created | Barrel export |

---

## Decisions

**Keep landing page as a server component** — Sign-in uses a server action (`'use server'`) and imports `signIn` from auth core. This avoids introducing unnecessary client state in the page shell.

**Use `searchParams` for auth error feedback** — NextAuth error redirects are surfaced directly on `/` so users get immediate failure context without a separate auth page.

**Consent is local and non-blocking** — Acceptance is stored in `localStorage` and the banner does not block page interaction. This keeps friction low while still communicating cookie/auth usage.

**Null-first consent state to prevent flash** — The hook starts with `null` and only renders once client storage is resolved, preventing visual flicker for returning users who already accepted.

---

## Validation

```bash
npx tsc --noEmit   # ✅ zero errors
npm run build      # ✅ clean build
npm run lint       # ✅ no lint violations
```
