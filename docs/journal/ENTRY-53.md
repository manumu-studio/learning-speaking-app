# ENTRY-53 — Pipeline Hardening
**Date:** 2026-05-30
**Type:** Infrastructure
**Branch:** `feat/pipeline-hardening`
**Version:** `0.47.1`
---
## What I Did
Fixed three latent defects in the chunked recording pipeline: the fan-in race when the last chunk completes, sessions stuck mid-processing, and silent chunk failures after QStash retries. Added a `ChunkFeature` table and stub extractor so pitch data can be persisted at chunk time without retaining audio.

## Files Touched

| File | Action | Notes |
|------|--------|-------|
| `prisma/schema.prisma` | Modified | Fan-in statuses, `processedAt`, `ChunkFeature` |
| `src/lib/pipeline/processChunk.ts` | Modified | Atomic fan-in guard, feature stub hook |
| `src/lib/pipeline/processFinal.ts` | Modified | Idempotent re-drive support |
| `src/lib/pipeline/extractFeatures.ts` | Created | Placeholder F0/intensity persistence |
| `src/lib/queue/qstash.ts` | Modified | Failure callback + deduplication |
| `src/app/api/internal/chunk-failed/route.ts` | Created | Marks chunks FAILED |
| `src/app/api/cron/sweep-stuck-sessions/route.ts` | Created | Re-drives or fails stuck sessions |
| `vercel.json` | Created | 2-minute cron schedule |

## Decisions
- Used conditional `updateMany` for fan-in claiming — simpler than advisory locks and safe under QStash retries.
- Sweeper skips sessions with recently updated chunks to avoid interrupting active processing.
- Feature extraction wrapped in try/catch so a stub failure never blocks transcription/scoring.

## Still Open
- Real parselmouth F0 extraction (future packet).
- Set `CRON_SECRET` in production before enabling cron.

## Validation
```bash
npx tsc --noEmit && npm run build && npm run lint && npm test -- --run
# All passed — 675 tests
```
