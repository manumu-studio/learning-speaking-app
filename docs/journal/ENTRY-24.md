# ENTRY-24 — CI/CD Pipeline Hardening

**Date:** 2026-04-03
**Type:** Infrastructure
**Branch:** `feature/ci-cd-hardening`
**Version:** `0.24.0`

---

## What I Did

The CI pipeline had been running builds and linting but never actually executing the test suite — a gap that meant a broken test would sail right through to `main`. I fixed that, then used the opportunity to close several other production-safety gaps I'd been deferring.

The work broke into five areas:

1. **CI completeness** — Added the test step (`npm run test`), wired up coverage reporting with a 40% floor, added `npm audit` to catch known vulnerabilities in CI, and added a bundle budget check (120 kB shared JS) so dependency bloat fails the build before it reaches production.

2. **Node version pinning** — Added `.nvmrc` set to Node 20. CI was already on Node 20 but local dev had been on Node 18, which caused `test:coverage` to behave differently. The `.nvmrc` file closes that gap for both local and CI environments.

3. **App Router error and loading surfaces** — Next.js expects `error.tsx` and `loading.tsx` files in route segments, but they were missing from all app routes. Without them, any unhandled error renders a raw Next.js error page, and any slow route shows a blank screen. I added `error.tsx` for the `(app)` and `(public)` route groups, and `loading.tsx` skeletons for dashboard, history, and drills.

4. **Security headers** — Added a Content Security Policy plus standard security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) directly in `next.config.ts`. The CSP is strict by default — no inline scripts, no external script sources unless explicitly listed.

5. **Dependabot** — Added `.github/dependabot.yml` to automate weekly dependency updates for both npm and GitHub Actions. This is a low-effort guard against falling far behind on security patches.

---

## Files Touched

| File | Change |
|------|--------|
| `.github/workflows/ci.yml` | Added test, coverage, security audit, and bundle-budget steps |
| `.github/dependabot.yml` | Created — npm + GitHub Actions weekly updates |
| `vitest.config.ts` | Added coverage config (v8 provider, 40% thresholds) |
| `package.json` | Version → 0.24.0; `test:coverage` script; new devDeps |
| `next.config.ts` | CSP + security headers; bundle analyzer wrapper |
| `src/components/ui/ErrorBoundary/ErrorBoundary.types.ts` | Added `AppRouterErrorProps` |
| `src/app/(app)/error.tsx` | Created — authenticated route error boundary |
| `src/app/(public)/error.tsx` | Created — public route error boundary |
| `src/app/(app)/dashboard/loading.tsx` | Created — skeleton |
| `src/app/(app)/history/loading.tsx` | Created — skeleton |
| `src/app/(app)/drills/loading.tsx` | Created — skeleton |
| `.nvmrc` | Created — Node 20 |

---

## Decisions

**Why v8 coverage instead of Istanbul?**
The v8 provider hooks into the V8 engine directly and requires no source transformation. This plays better with the ESM + Vitest setup and avoids the class of instrumentation bugs Istanbul can introduce with TypeScript + JSX.

**Why 40% coverage threshold?**
It's the honest floor given the current test surface — not aspirational, not embarrassingly low. It gives us a ratchet: once coverage improves, the threshold goes up with it. Failing below 40% is worse than having no gate, so starting here is better than waiting for a more "impressive" number.

**Why headers in `next.config.ts` instead of middleware?**
Security headers don't need request-level logic — they're static policy. Putting them in `next.config.ts` avoids middleware execution cost on every request and keeps the configuration co-located with everything else Next.js controls.

**Why weekly Dependabot?**
Daily PRs create noise and developer fatigue. Weekly batches are frequent enough to stay current on security patches without drowning the PR queue.

---

## Still Open

- CSP `script-src` is strict. If third-party analytics or embeds are added, the policy will need a targeted update — this is intentional, not an oversight.
- Coverage thresholds at 40% are a floor, not a goal. Future test work should push these toward 70%+.

---

## Validation

```
npx tsc --noEmit   → 0 errors
npm run lint       → 0 violations
npm run test       → 35 tests pass (6 files)
npm run build      → clean; shared JS 102 kB (under 120 kB budget)
```
