# PR-0.3.0 — OIDC Auth Integration (PACKET-03)

**Branch:** `feature/auth-integration`
**Version:** `0.3.0`
**Date:** 2026-02-18
**Type:** Feature (Complete)

---

## Summary

Complete OIDC auth integration: NextAuth v5 beta feature files, API route handler, sign-in/error pages, middleware for route protection, and protected layout with session management. Includes test protected route for validation.

---

## What Was Built

### Auth Feature (`src/features/auth/`)
- `syncUser.ts` — Thin wrapper calling `findOrCreateUser` from `db-utils`; called by the protected layout after sign-in
- `useSession.ts` — Client-side re-export of `useSession` with `'use client'` boundary
- `index.ts` — Barrel export: `auth`, `signIn`, `signOut`, `useSession`, `syncUser`, `Session`

### API Route
- `src/app/api/auth/[...nextauth]/route.ts` — Exports `GET` and `POST` handlers from NextAuth

### Pages
- `src/app/auth/signin/page.tsx` — Sign-in form with server action calling `signIn('manumustudio', { redirectTo: callbackUrl })`
- `src/app/auth/error/page.tsx` — Displays error code from `searchParams`
- `src/app/(public)/page.tsx` — Landing page replaced: button → `Link` to `/auth/signin`

### Middleware & Protected Layout
- `src/middleware.ts` — Edge middleware protecting `/session`, `/history`, `/profile`, `/settings` routes; redirects unauthenticated users to `/auth/signin` with `callbackUrl`
- `src/app/(app)/layout.tsx` — Protected layout: checks auth, calls `syncUser`, wraps in `SessionProvider`, shows user greeting + sign-out button
- `src/app/(app)/session/new/page.tsx` — Test protected route accessible only when authenticated

---

## Pre-Existing (Not Modified)
- `src/features/auth/auth.ts` — NextAuth config with OIDC provider, JWT strategy, `externalId` callbacks
- `src/features/auth/auth.types.ts` — Module augmentation for `Session` and `JWT`
- `src/lib/env.ts` — Auth env vars already present from PACKET-02

---

## Architecture Decisions

| Decision | Rationale |
|---|---|
| JWT sessions | Stateless — no session table, token carries `externalId` |
| `syncUser` in layout, not middleware | Middleware runs on edge runtime (DB-free); layout is the right layer for DB operations |
| Middleware uses `auth()` wrapper | NextAuth v5 beta pattern for edge-compatible auth checks |
| PKCE + state | Security requirement for OIDC public clients |
| `'use server'` inline | NextAuth v5 `signIn`/`signOut` are server-only; inline directive is valid |

---

## Validation Gates

```bash
npx tsc --noEmit   # ✅ zero errors
npm run build      # ✅ 6 routes, clean build
npm run lint       # ✅ no warnings or errors
```

---

## Testing Checklist

*(Full end-to-end testing requires real OIDC credentials)*

- [ ] OAuth flow: landing → `/auth/signin` → `auth.manumustudio.com` → redirect back with valid session
- [ ] Route protection: unauthenticated access to `/session/new` redirects to `/auth/signin` with `callbackUrl`
- [ ] Post-sign-in redirect: `callbackUrl` is honored after successful auth
- [ ] User sync: DB record created with matching `externalId` after first sign-in
- [ ] Protected layout: shows user greeting (first name + email) when authenticated
- [ ] Sign-out: button clears session and redirects to `/`
- [ ] Error page: error code displayed at `/auth/error`
- [ ] Middleware protection: all four routes (`/session`, `/history`, `/profile`, `/settings`) require auth

---

## Deployment Notes

- Requires `.env.local` with: `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `AUTH_CLIENT_ID`, `AUTH_CLIENT_SECRET`
- OAuth redirect URI must be registered: `http://localhost:3000/api/auth/callback/manumustudio`
- Production `NEXTAUTH_URL` must match the deployed domain
- `NEXTAUTH_SECRET` must be ≥ 32 characters (`openssl rand -base64 32`)
