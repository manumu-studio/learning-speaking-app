# ADR-001: OIDC + PKCE via external auth server

**Date:** 2026-04-03  
**Status:** Accepted  

## Context

The app needs authenticated users, SSO-friendly login, and a path to multiple products sharing identity. NextAuth (Auth.js) v5 is integrated with an external OIDC provider (`auth.manumustudio.com`) rather than embedding many social providers in-app. Federated sign-out must end the session at the IdP, not only clear local cookies.

## Decision

Use **OpenID Connect with PKCE** through NextAuth configuration in `src/features/auth/auth.ts` (and the catch-all route under `src/app/api/auth/[...nextauth]/`). Session material is carried in encrypted JWT cookies. The dedicated route `src/app/api/auth/federated-signout/route.ts` builds the IdP logout URL, forwards `id_token_hint` when decodable from the session cookie, and clears Auth.js cookies before redirect.

## Alternatives considered

- **NextAuth built-in Google/GitHub only** — simpler for a single app but weak for a studio-wide SSO story and federated logout.
- **Session-only DB store without OIDC** — extra infrastructure and still no standard SSO for sister apps.
- **Custom JWT minting** — duplicates OIDC token lifecycle and refresh concerns already solved by the IdP.

## Consequences

- **Pros:** One IdP policy for all apps; PKCE for public clients; clear logout contract with `post_logout_redirect_uri`.
- **Cons:** Dependency on IdP uptime; developers must configure `AUTH_CLIENT_*`, `NEXTAUTH_*`, and `APP_URL` consistently (see `docs/DEPLOYMENT.md`).
- **Operational:** Cookie names differ in secure vs non-secure contexts (`__Secure-*`); middleware and CSRF logic assume `APP_URL` origin alignment.
