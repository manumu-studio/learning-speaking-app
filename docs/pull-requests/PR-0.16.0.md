# PR-0.16.0 — Training system backend (drills)

**Branch:** `feature/training-architecture` → `main`
**Version:** `0.16.0`
**Date:** 2026-03-31
**Status:** ✅ Ready to merge

---

## Summary

Adds drill persistence, AI-backed drill generation and evaluation, metric-driven recommendations after sessions, authenticated drill HTTP APIs with a short-audio transcribe-and-delete flow, and seed data for development.

## Files Changed

| File | Action | Notes |
|------|--------|-------|
| `prisma/schema.prisma` | Modified | `DrillAttempt`; session `focusMetricKey` |
| `prisma/seed.ts` | Modified | Drill fixtures |
| `src/lib/ai/client.ts` | Created | Shared Anthropic client |
| `src/lib/ai/analyze.ts` | Modified | Uses shared client |
| `src/features/training/*` | Created | Types + drill services |
| `src/app/api/drills/**` | Created | Create, get, complete |

## Architecture Decisions

| Decision | Why |
|----------|-----|
| Optional `focusMetricKey` on `SpeakingSession` | Clean priority rule for recommendations vs. lowest metric score |
| R2 upload then delete after Whisper | Matches session privacy pattern for temporary audio |
| `auth()` + `findOrCreateUser` in drill routes | Same identity resolution as existing session APIs |

## Testing Checklist

- [ ] `npx prisma db push` (or migrate) against target DB
- [ ] `npm run db:seed` completes
- [ ] `POST /api/drills` returns id + prompt (authenticated)
- [ ] `GET /api/drills/:id` returns 404 for another user’s id
- [ ] `POST /api/drills/:id/complete` with audio returns feedback and sets `completedAt`; second call returns 409

## Deployment Notes

- Requires schema migration/push before deploy.
- No new environment variables; uses existing Anthropic, OpenAI (Whisper), and R2 configuration.

## Validation

```text
npx tsc --noEmit  ✅
npm run lint      ✅
npm run build     ✅
npx vitest run    ✅
```
