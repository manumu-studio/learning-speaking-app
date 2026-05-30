# PR-0.47.1 — Pipeline Hardening
**Branch:** `feat/pipeline-hardening` → `main`
**Version:** `0.47.1`
**Date:** 2026-05-30
**Status:** ✅ Ready to merge
---
## Summary
Hardens the chunked recording pipeline with an atomic fan-in guard, idempotent final processing, QStash failure callbacks for chunks, and a cron sweeper for stuck sessions. Adds `ChunkFeature` storage with a stub extractor for future pitch visualization.

## Files Changed

| File | Action | Notes |
|------|--------|-------|
| `prisma/schema.prisma` | Modified | `AWAITING_FINAL`, `PROCESSING_FINAL`, `ChunkFeature` |
| `src/lib/pipeline/processChunk.ts` | Modified | Atomic fan-in + feature stub |
| `src/lib/pipeline/processFinal.ts` | Modified | Idempotent with `processedAt` |
| `src/lib/queue/qstash.ts` | Modified | failureCallback, deduplicationId |
| `src/app/api/cron/sweep-stuck-sessions/route.ts` | Created | Stuck session recovery |
| `src/app/api/internal/chunk-failed/route.ts` | Created | Chunk failure handler |
| `vercel.json` | Created | Cron config |

## Architecture Decisions

| Decision | Why |
|----------|-----|
| Atomic `updateMany` fan-in | Prevents duplicate final jobs without distributed locks |
| `processedAt` on session | Detects completed runs for idempotent re-drives |
| QStash deduplication on final | Belt-and-braces against duplicate enqueue |
| Cron every 2 minutes | Catches stuck sessions without heavy DB load |

## Testing Checklist
- [x] Fan-in guard: concurrent claims enqueue once
- [x] Chunk failure callback marks chunk FAILED
- [x] Sweeper marks failed-chunk sessions FAILED
- [x] Sweeper re-drives all-done stuck sessions
- [x] processFinal idempotent on re-drive
- [x] Full CI quality gate passes

## Deployment Notes
1. Run `npx prisma migrate deploy` before or during deploy.
2. Add `CRON_SECRET` to Vercel environment variables.
3. Vercel cron requires Pro plan or higher.

## Validation
```
npx tsc --noEmit          ✅
npm run build             ✅
npm run lint              ✅
npx prisma validate       ✅
npm test -- --run         ✅ 675 passed
```
