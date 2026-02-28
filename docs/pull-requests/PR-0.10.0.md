# PR-0.10.0 — Federated Sign-Out (OIDC RP-Initiated Logout)

**Branch:** `feature/federated-signout` → `main`
**Version:** `0.10.0`
**Date:** 2026-02-28
**Status:** ✅ Ready to merge

---

## Summary

Implemented federated sign-out so a user logout destroys both local LSA auth state and the upstream auth server session. This prevents silent auto-approval on the next login and restores expected re-authentication behavior.

---

## What Was Built

| File | Purpose |
|---|---|
| `src/features/auth/auth.types.ts` | Extended JWT type with `idToken?: string` |
| `src/features/auth/auth.ts` | JWT callback captures `account.id_token` on initial OAuth callback |
| `src/app/api/auth/federated-signout/route.ts` | New server route: decode JWT cookie, clear auth cookies, redirect to auth logout endpoint |
| `src/components/ui/TopBar/TopBar.tsx` | Sign-out button now navigates to federated sign-out route |

---

## Architecture Decisions

| Decision | Rationale |
|---|---|
| Server-side logout bridge route | Keeps `id_token` fully server-side and avoids exposing token in client session payload |
| JWT decode from auth cookie (`next-auth/jwt`) | Reuses existing session token source without additional storage |
| Dual cookie-name support | Handles both non-secure and secure Auth.js cookie names across environments |
| `client_id` fallback when `id_token` missing | Maintains logout path for edge cases where token hint is unavailable |
| Redirect-based sign-out from TopBar | Preserves simple UX while delegating security-sensitive steps to server route |

---

## Validation

```bash
pnpm tsc --noEmit   # ✅ pass
pnpm lint           # ✅ pass
pnpm build          # ✅ pass
```

---

## Test Plan

- [x] Typecheck passes
- [x] Lint passes
- [x] Build passes
- [ ] Sign in and click sign out
- [ ] Confirm redirect to `https://auth.manumustudio.com/oauth/logout`
- [ ] Confirm return redirect to `APP_URL`
- [ ] Attempt protected route access and confirm full re-authentication required
- [ ] Verify fallback flow still redirects with `client_id` when `id_token` is unavailable

---

## Deployment Notes

- No new dependencies
- No schema migrations
- No new environment variables
- Requires auth server logout endpoint to remain available at `/oauth/logout`
