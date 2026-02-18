# ENTRY-3 — OIDC Auth Integration (PACKET-03a)

**Date:** 2026-02-18
**Type:** Auth
**Branch:** `feature/auth-integration`
**Version:** `0.3.0`

---

## What I Did

Built the auth core layer for PACKET-03a: `syncUser`, `useSession`, the barrel export, the NextAuth API route handler, sign-in/error pages, and the updated landing page. The NextAuth config (`auth.ts`) and type extensions (`auth.types.ts`) already existed and were left untouched.

Middleware and protected layout are deferred to **PACKET-03b**.

---

## Files Touched

| File | Action | Notes |
|---|---|---|
| `src/features/auth/auth.ts` | Pre-existing | Already correct — not modified |
| `src/features/auth/auth.types.ts` | Pre-existing | Already correct — not modified |
| `src/features/auth/syncUser.ts` | Created | Wraps `findOrCreateUser` from db-utils |
| `src/features/auth/useSession.ts` | Created | Client-side `useSession` re-export with `'use client'` |
| `src/features/auth/index.ts` | Created | Barrel export for auth feature |
| `src/app/api/auth/[...nextauth]/route.ts` | Created | NextAuth GET + POST route handler |
| `src/app/auth/signin/page.tsx` | Created | Sign-in page with server action + OAuth button |
| `src/app/auth/error/page.tsx` | Created | Auth error display page |
| `src/app/(public)/page.tsx` | Replaced | Landing page with working sign-in Link |
| `src/features/auth/.gitkeep` | Deleted | Replaced by real files |

---

## What Went Differently

### `auth.ts` and `auth.types.ts` were pre-existing

The original PACKET-03 spec included these as files to create, but they had already been built. No changes needed.

### `env.ts` was already updated in PACKET-02

Auth env vars (NEXTAUTH_SECRET, NEXTAUTH_URL, AUTH_CLIENT_ID, AUTH_CLIENT_SECRET) were speculatively included in PACKET-02. No changes needed.

---

## Decisions

**`syncUser` as a thin wrapper** — Keeps the auth feature decoupled from `db-utils` internals. The layout calls `syncUser`, which calls `findOrCreateUser`. One layer of indirection, clean boundary.

**`useSession` as a re-export file** — Following the project rule that client-only hooks must be clearly marked with `'use client'`. This file is the designated client boundary for the session hook.

**`'use server'` on form actions** — `signIn` from NextAuth v5 is server-only. Inline `'use server'` on the form action is the correct pattern for server actions defined inside async server components.

---

## Still Open

- `src/middleware.ts` — deferred to PACKET-03b
- `src/app/(app)/layout.tsx` — deferred to PACKET-03b
- `src/app/(app)/session/new/page.tsx` — deferred to PACKET-03b
- No real OIDC credentials yet — `.env.local` uses placeholders. OAuth flow will fail until provisioned.
- `getUserSessions` return type still unresolved (carried from ENTRY-2).

---

## Validation

```bash
npx tsc --noEmit   # ✅ zero errors
npm run build      # ✅ clean — 6 routes including auth endpoints
npm run lint       # ✅ no warnings or errors
```

---

## PACKET-03b — Middleware + Protected Layout

**Date:** 2026-02-18

### What I Did

Built middleware for route protection and the protected app layout. Middleware uses the NextAuth v5 `auth()` wrapper pattern and protects four route patterns. Protected layout checks session, syncs user to DB via `syncUser`, and wraps children in `SessionProvider`. Test protected route added for validation.

### Files Touched

| File | Action | Notes |
|---|---|---|
| `src/middleware.ts` | Created | Edge middleware protecting `/session`, `/history`, `/profile`, `/settings` |
| `src/app/(app)/layout.tsx` | Created | Protected layout with auth check, `syncUser`, `SessionProvider`, sign-out |
| `src/app/(app)/session/new/page.tsx` | Created | Test protected route showing welcome message |

### Decisions

**Middleware uses `auth()` wrapper pattern** — NextAuth v5 beta pattern for edge-compatible auth checks. Redirects to `/auth/signin` with `callbackUrl` preserved.

**`syncUser` called in layout, not middleware** — Middleware runs on edge runtime which is DB-free. Layout is the right layer for DB operations after auth check passes.

**`SessionProvider` wraps children** — Required for client components using `useSession`. Layout provides the context boundary.

### Still Open

- `getUserSessions` return type still unresolved (carried from ENTRY-2)
- OIDC credentials are now provisioned (OAuth client registered on auth server via seed script)

### Validation

```bash
npx tsc --noEmit   # ✅ zero errors
npm run build      # ✅ clean — 6 routes
npm run lint       # ✅ no warnings or errors
```
