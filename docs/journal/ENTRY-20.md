# ENTRY-20 — Security hardening (CSRF, API rate limits, prompt sanitisation)

**Date:** 2026-04-01
**Type:** Infrastructure
**Branch:** `feature/security-hardening`
**Version:** `0.20.0`

---

## What I Did

- Added CSRF origin checks to drill creation, drill completion, and session deletion so they match the protection already used on session upload.
- Centralised API rate limiting in middleware for all non-auth API routes and removed the duplicate limiter from the session upload handler.
- Sanitised user-supplied strings before they are embedded in drill-related AI prompts to reduce prompt-injection risk.

## Files Touched

| File | Action | Notes |
|------|--------|-------|
| `package.json` | Updated | Version 0.20.0 |
| `src/lib/rateLimit.ts` | Updated | General-purpose limiter name and key prefix; Edge-compatible Redis client |
| `src/lib/sanitizePromptInput.ts` | Added | Small, reviewable escaping rules |
| `src/middleware.ts` | Added | Rate limit matcher excludes `/api/auth/*` |
| `src/app/api/sessions/route.ts` | Updated | Rate limit only in middleware |
| `src/app/api/sessions/[id]/route.ts` | Updated | CSRF on DELETE |
| `src/app/api/drills/route.ts` | Updated | CSRF on POST |
| `src/app/api/drills/[id]/complete/route.ts` | Updated | CSRF on POST |
| `src/features/training/generateDrill.ts` | Updated | Sanitise examples, focus, transcript, intent |
| `src/features/training/evaluateDrill.ts` | Updated | Sanitise transcript and source example for model path |

## Decisions

- Chose the Upstash "cloudflare" Redis entry so middleware stays compatible with the Edge runtime without build-time warnings.
- Left AI-generated drill prompt text unsanitised in evaluation, since it is produced by our own generator rather than raw user input.

## Still Open

- Webhook and internal POST routes remain outside CSRF by design (HMAC or environment guards); they still pass through the same API rate limiter when Redis is configured.

## Validation

- `npx tsc --noEmit`, `npm run lint`, `npm run test`, `npm run build` — all succeeded on 2026-04-01.
