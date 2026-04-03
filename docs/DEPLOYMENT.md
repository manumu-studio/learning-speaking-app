# Deployment guide

Production-oriented checklist for the Learning Speaking App on Vercel + managed services.

## Prerequisites

- **Vercel** project linked to the repo
- **Neon** (or other Postgres) — connection string compatible with Prisma
- **Cloudflare R2** — bucket + S3 API token
- **Upstash** — QStash (required for async pipeline in prod); Redis optional (rate limiting)
- **OIDC provider** — client for `auth.manumustudio.com` (or your IdP) with correct redirect URIs
- **OpenAI + Anthropic** API keys for the AI pipeline

## Environment variables

Authoritative list and comments: **`.env.example`**.

Critical production flags:

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | Neon pooled connection; run `prisma migrate deploy` on release |
| `NEXTAUTH_SECRET` | Strong secret for Auth.js JWT encryption |
| `NEXTAUTH_URL` | Public site URL (e.g. `https://your-domain.com`) |
| `APP_URL` | Must match the user-facing origin; used for CSRF `Origin` checks and logout redirect |
| `AUTH_CLIENT_ID` / `AUTH_CLIENT_SECRET` | OIDC client credentials |
| `QSTASH_*` | Token + signing keys — optional in Zod schema but **required** for `/api/internal/process` to verify webhooks |
| `UPSTASH_REDIS_*` | If omitted, rate limiting is disabled (middleware skips limiter) |
| `R2_*` | Required for audio upload path |

## Database

```bash
npx prisma migrate deploy
```

Seed only if you use non-production fixtures: `npm run db:seed`.

## Vercel

- **Framework preset:** Next.js  
- **Node:** 20.x (match `package.json` engines)  
- **Env:** Copy all required vars from `.env.example` into Vercel project settings (Production + Preview as needed).  
- **Domain:** Add custom domain; ensure `NEXTAUTH_URL` and `APP_URL` use that HTTPS origin.

## Auth configuration

Register redirect URIs with the IdP:

- Callback: `{NEXTAUTH_URL}/api/auth/callback/{provider}` (per Auth.js / NextAuth setup)
- Post-logout: `APP_URL` (used by federated sign-out route)

Use a single consistent secret name in Vercel — the app expects **`NEXTAUTH_SECRET`** (do not rely on legacy `AUTH_SECRET` alone).

## Post-deploy checks

1. Sign-in and sign-out (including federated logout if enabled).  
2. Record upload → session reaches `DONE` (QStash delivery + internal process route).  
3. Dashboard loads without 401 loops.  
4. Drill create + complete happy path.

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| 403 on POST from browser | `Origin` / `Referer` does not match `APP_URL` origin (`validateOrigin` in `src/lib/csrf.ts`) |
| Pipeline never runs | Missing or wrong `QSTASH_*` keys; QStash URL not reachable; signature verification failure |
| Auth cookie not clearing on redirect | Known sharp edge: avoid relying on `cookies().delete()` across redirects without re-reading response patterns — keep logout flow on dedicated route |
| Rate limit always off | `UPSTASH_REDIS_*` unset — intentional degradation |
| Build OK locally but fails in CI | Use Node 20; ensure optional native deps install for Tailwind oxide on the target OS |

**APP_URL:** Must be set on Vercel to your canonical HTTPS URL so CSRF and logout redirects succeed.
