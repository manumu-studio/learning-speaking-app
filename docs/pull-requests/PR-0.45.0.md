# PR-0.45.0 — Chunked Recording Pipeline
**Branch:** `feat/chunked-recording-pipeline` → `main`
**Version:** `0.45.0`
**Date:** 2026-05-28
**Status:** ✅ Ready to merge
---
## Summary

Replaces MediaRecorder with AudioWorklet-based PCM capture that produces unlimited-length recordings as 2-minute WAV chunks. Chunks upload to R2 in the background and process in parallel; a fan-in worker produces unified session results with near-instant turnaround when the user stops.

## Files Changed

| File | Action | Notes |
|------|--------|-------|
| Audio capture (`wavEncoder`, worklet, worker, hooks) | Created | Browser-side chunked PCM pipeline |
| `SessionChunk` model + migration | Created | Per-chunk transcript and scores |
| Chunk API routes (presign, enqueue, complete) | Created | Direct R2 upload flow |
| QStash workers (process-chunk, process-final) | Created | Parallel + fan-in processing |
| RecordingPanel + ChunkProgressBar | Modified/Created | No time limit, live chunk status |
| Session results page + ChunkBreakdown | Modified/Created | Overall / By Segment toggle |

## Architecture Decisions

| Decision | Why |
|----------|-----|
| AudioWorklet + WAV | Zero-gap capture; no Safari WebM quirks |
| 1.5s overlap + word dedup | Reliable boundary stitching without streaming ASR |
| Pre-signed R2 PUT | Offloads upload bandwidth from Vercel |
| Single Claude call on fan-in | Cost-efficient; coaching needs full-session context |

## Testing Checklist

- [ ] Apply migration: `npx prisma migrate deploy`
- [ ] Record 3+ minutes — verify multiple chunks upload during recording
- [ ] Stop recording — session reaches DONE with unified transcript
- [ ] Results page — toggle Overall / By Segment shows chunk breakdown
- [ ] Safari/iOS — recording starts after tap; background tab shows warning
- [ ] Dev mode — chunk + final workers fire via `/api/dev/process-chunk` and `/api/dev/process-final`

## Deployment Notes

- Requires `@aws-sdk/s3-request-presigner` (added to package.json)
- New env vars use existing R2 + QStash credentials — no new secrets
- Run database migration before deploy

## Validation

```
npx tsc --noEmit          ✅
npm run build             ✅
npm run lint              ✅
npx prisma validate       ✅
npm test -- --run         ✅ 571 passed
```
