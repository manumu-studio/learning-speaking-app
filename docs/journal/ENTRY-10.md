# ENTRY-10 — Federated Sign-Out via OIDC RP-Initiated Logout (PACKET-10)

**Date:** 2026-02-28
**Type:** Feature
**Branch:** `feature/federated-signout`
**Version:** `0.10.0`

---

## What I Did

Implemented federated sign-out so the sign-out action terminates both sessions involved in auth: the local Auth.js session and the remote auth server session. Added a dedicated server route to read the JWT cookie, extract `id_token`, clear local auth cookies, and redirect to the auth server logout endpoint with `post_logout_redirect_uri`.

---

## Files Touched

| File | Action | Notes |
|---|---|---|
| `src/features/auth/auth.types.ts` | Modified | Added `idToken?: string` on JWT type augmentation |
| `src/features/auth/auth.ts` | Modified | Stored `account.id_token` in JWT callback on initial sign-in |
| `src/app/api/auth/federated-signout/route.ts` | Created | Decodes JWT, builds logout URL, deletes cookies, redirects |
| `src/components/ui/TopBar/TopBar.tsx` | Modified | Replaced local `signOut` call with route navigation |

---

## Decisions

**JWT-internal `id_token` storage** — `id_token` is required for RP-initiated logout hinting but should remain server-side. Storing it in JWT token state avoids exposing it in the session payload.

**Dedicated server logout route** — all sign-out security logic (cookie decode + cookie deletion + redirect generation) lives in one server endpoint to keep client code minimal and token-safe.

**Cookie-name dual support** — both `authjs.session-token` and `__Secure-authjs.session-token` are supported to cover dev and production naming differences.

**`client_id` fallback path** — if `id_token` is not present (edge case), logout still proceeds with `client_id` so the auth server can resolve the client context.

---

## Validation

```bash
pnpm tsc --noEmit   # ✅ zero errors
pnpm lint           # ✅ no warnings/errors
pnpm build          # ✅ clean build (route generated)
```
