# ENTRY-3b — Middleware + Protected Layout (PACKET-03b)

**Date:** 2026-02-18
**Type:** Auth
**Branch:** `feature/auth-integration`
**Version:** `0.3.0`

---

## What I Did

Built middleware for route protection and the protected app layout. Middleware uses the NextAuth v5 `auth()` wrapper pattern and protects four route patterns. Protected layout checks session, syncs user to DB via `syncUser`, and wraps children in `SessionProvider`. Test protected route added for validation.

---

## Files Touched

| File | Action | Notes |
|---|---|---|
| `src/middleware.ts` | Created | Edge middleware protecting `/session`, `/history`, `/profile`, `/settings` |
| `src/app/(app)/layout.tsx` | Created | Protected layout with auth check, `syncUser`, `SessionProvider`, sign-out |
| `src/app/(app)/session/new/page.tsx` | Created | Test protected route showing welcome message |

---

## What Went Differently

Nothing unexpected in this sub-packet. All files were net-new. The key constraints (edge runtime, `SessionProvider` requirement) were already understood from PACKET-03a decisions.

---

## Decisions

**Middleware uses `auth()` wrapper pattern** — NextAuth v5 beta pattern for edge-compatible auth checks. Redirects to `/auth/signin` with `callbackUrl` preserved.

**`syncUser` called in layout, not middleware** — Middleware runs on edge runtime which is DB-free. Layout is the right layer for DB operations after auth check passes.

**`SessionProvider` wraps children** — Required for client components using `useSession`. Layout provides the context boundary.

---

## Still Open

- `getUserSessions` return type still unresolved (carried from ENTRY-2)
- OIDC credentials are now provisioned (OAuth client registered on auth server via seed script)

---

## Validation

```bash
npx tsc --noEmit   # ✅ zero errors
npm run build      # ✅ clean — 6 routes
npm run lint       # ✅ no warnings or errors
```
