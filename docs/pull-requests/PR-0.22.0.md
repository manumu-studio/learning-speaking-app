# PR-0.22.0 — Testing foundation and recording consent on session upload
**Branch:** `feature/testing-foundation` → `main`
**Version:** `0.22.0`
**Date:** 2026-04-02
**Status:** ✅ Ready to merge
---
## Summary
This release adds a proper unit-testing baseline for high-risk modules (AI analysis schemas, drills, dashboard aggregation, consent) and enforces recording storage consent on the session upload API before any audio is accepted.

## Files Changed (table: File | Action | Notes)
| File | Action | Notes |
|------|--------|-------|
| `package.json` | Updated | Dev dependency + semver |
| `vitest.config.ts` | Updated | Global Prisma mock setup |
| `src/__mocks__/prisma.ts` | Added | Shared mock |
| `src/lib/ai/analyze.ts` | Updated | Exported schemas |
| `src/lib/ai/analyze.test.ts` | Updated | Aligns with production schema |
| `src/features/training/*test.ts` | Added | Drill pipeline coverage |
| `src/features/dashboard/getDashboardData.test.ts` | Added | Streak / trend / stats |
| `src/lib/db-utils.test.ts` | Added | Consent helper |
| `src/app/api/sessions/route.ts` | Updated | `CONSENT_REQUIRED` gate |

## Architecture Decisions (table: Decision | Why)
| Decision | Why |
|----------|-----|
| Prisma `mockDeep` singleton | Keeps DB tests fast and deterministic without spinning Postgres |
| Consent before `formData()` | Avoids parsing uploads when the user cannot legally store audio |

## Testing Checklist (checkboxes)
- [x] `npx vitest run` passes
- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes
- [x] `npm run build` passes
- [ ] Manual: authenticated user without `AUDIO_STORAGE` receives 403 on `POST /api/sessions`
- [ ] Manual: user with active consent can still upload

## Deployment Notes
- No migration changes. Ensure existing users who should record have granted `AUDIO_STORAGE` in the consent flow; otherwise uploads will start returning 403 until they consent.

## Validation (commands + results)
- `npx vitest run` — 35 tests passed (2026-04-02).
- `npx tsc --noEmit`, `npm run lint`, `npm run build` — success (2026-04-02).
