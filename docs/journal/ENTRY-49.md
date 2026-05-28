# ENTRY-49 — Chunked Recording Pipeline
**Date:** 2026-05-28
**Type:** Feature
**Branch:** `feat/chunked-recording-pipeline`
**Version:** `0.45.0`
---
## What I Did

Built an unlimited-duration recording pipeline using AudioWorklet PCM capture instead of MediaRecorder. Audio is split into 2-minute WAV chunks with 1.5s overlap, uploaded directly to R2 while the user keeps speaking, and processed in parallel via QStash. When recording stops, a fan-in worker deduplicates overlapping transcript words, aggregates Azure pronunciation scores, and runs a single Claude analysis on the full session.

## Files Touched

| File | Action | Notes |
|------|--------|-------|
| `src/lib/audio/wavEncoder.ts` | Created | 44-byte RIFF header + Int16 PCM |
| `public/worklets/pcm-collector.worklet.js` | Created | Continuous PCM capture |
| `src/features/recording/useAudioWorklet.ts` | Created | Browser capture orchestration |
| `src/features/recording/useChunkUploader.ts` | Created | Presign → PUT → enqueue flow |
| `src/lib/pipeline/processChunk.ts` | Created | Per-chunk Whisper + Azure |
| `src/lib/pipeline/processFinal.ts` | Created | Transcript dedup + fan-in |
| `prisma/schema.prisma` | Modified | SessionChunk model |
| `src/features/recording/RecordingPanel/` | Modified | Chunked recording UI |
| `src/components/ui/ChunkProgressBar/` | Created | Live chunk status |
| `src/components/ui/ChunkBreakdown/` | Created | Per-segment results view |

## Decisions

- WAV chunks at 16 kHz mono eliminate Safari MediaRecorder container issues and skip server-side ffmpeg transcoding per chunk
- Overlap dedup uses Whisper word timestamps rather than VAD-aligned boundaries — simpler and sufficient at 2-minute granularity
- Recording no longer has a 5-minute cap; chunks process in background so results are ready faster when the user stops

## Still Open

- Run `npx prisma migrate deploy` against production before shipping
- E2E tests for full chunked record → process → results flow not yet added

## Validation

```bash
npx tsc --noEmit && npm run build && npm run lint && npx prisma validate && npm test -- --run
# All passed — 571 tests, clean build
```
