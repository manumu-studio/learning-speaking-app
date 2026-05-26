# PR-0.29.1 — Session Recording Hotfix
**Branch:** `fix/session-consent-zod-csp` → `main`
**Version:** `0.29.1`
**Date:** 2026-05-26
**Status:** ✅ Ready to merge

---

## Summary

Fixes four bugs blocking the end-to-end recording flow: consent auto-granting, Zod schema null handling, File/Blob Node.js compatibility, and CSP audio playback.

## Bugs Fixed
| Bug | Root Cause | Fix |
|-----|-----------|-----|
| "Recording consent required" | `AUDIO_STORAGE` consent never created for new users | Auto-grant consents in `findOrCreateUser` + backfill for existing users |
| "Failed to create session" (500) | `File` global not available in Node.js runtime | Changed `File` → `Blob` in Zod schema and `validateAudioFile` |
| "Session not found" after 201 | Zod `.optional()` rejects `null` but Prisma returns `null` for missing `transcript` relation | Changed to `.nullable().optional()` |
| Audio playback blocked by CSP | No `media-src` directive, falls back to `default-src 'self'` which blocks `blob:` URLs | Added `media-src 'self' blob:` to CSP |

## Files Changed
| File | Action | Notes |
|------|--------|-------|
| src/lib/db-utils.ts | Modified | Auto-grant consents in `findOrCreateUser`, backfill existing users |
| src/app/api/sessions/route.ts | Modified | `File` → `Blob` in Zod schema + `validateAudioFile` |
| src/lib/api.ts | Modified | `File` → `Blob` type reference |
| src/features/session/useSessionStatus.ts | Modified | `transcript` schema: `.optional()` → `.nullable().optional()` |
| src/middleware.ts | Modified | Added `media-src 'self' blob:` to CSP |
| .gitignore | Modified | Added `.planning/` |

## Testing Checklist
- [x] `npx tsc --noEmit` — zero type errors
- [x] `useSessionStatus` tests — 5 passed
- [x] `middleware` tests — 10 passed
- [x] No `any` types in changed files

## Deployment Notes
- No new environment variables
- No database migrations required
- No breaking API changes
- Consent backfill runs lazily on next `findOrCreateUser` call per user
