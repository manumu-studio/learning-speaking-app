# PR-0.7.0 — Async Processing Pipeline (QStash + Whisper + Claude)

**Branch:** `feature/processing-pipeline` → `main`
**Version:** `0.7.0`
**Date:** 2026-02-18
**Packet:** PACKET-07 (07a + 07b + 07c)
**Status:** ✅ COMPLETE — 07a ✅ 07b ✅ 07c ✅

---

## Summary

Wires the full async processing pipeline: after a session is uploaded, QStash triggers a webhook that downloads the audio from R2, transcribes it via Whisper, analyzes the transcript with Claude, stores the results in Postgres, and deletes the audio from R2. After this PR, the app goes from "upload succeeds" to "feedback appears."

---

## What Was Built

### PACKET-07a — QStash Client + Whisper STT Client ✅

| File | Purpose |
|---|---|
| `src/lib/queue/qstash.ts` | QStash client — `enqueueProcessing(sessionId)` publishes job to `/api/internal/process` |
| `src/lib/ai/whisper.ts` | Whisper client — `transcribeAudio(buffer, filename)` returns transcript string |

### PACKET-07b — Claude Analysis Client ✅

| File | Purpose |
|---|---|
| `src/lib/ai/analyze.ts` | Claude Haiku client — `analyzeTranscript(transcript)` returns Zod-validated `AnalysisResult` |

### PACKET-07c — Webhook Handler + Pipeline Wiring ✅

| File | Purpose |
|---|---|
| `src/app/api/internal/process/route.ts` | QStash webhook — orchestrates full pipeline (download → transcribe → analyze → store → delete) |
| `src/features/session/updatePatternProfile.ts` | Pattern profile upsert — aggregates insight counters across sessions |
| `src/app/api/sessions/route.ts` | Modified — replaces QStash TODO stub with real `enqueueProcessing()` call |

---

## Architecture Decisions

| Decision | Rationale |
|---|---|
| Lazy singleton pattern for all AI/queue clients | Vars are optional in Zod schema; fail-fast at call time with descriptive errors rather than crashing at boot |
| `requireEnv()` helper (not `!` assertions) | Explicit error message names the missing variable — easier to debug in serverless cold starts |
| Buffer → ArrayBuffer conversion for Whisper `File` | `Buffer.buffer` is `ArrayBufferLike` (includes `SharedArrayBuffer`) — incompatible with `BlobPart` under strict TypeScript; `.slice()` yields a plain `ArrayBuffer` |
| `whisper-1` + `language: 'en'` | English hint reduces hallucinations; latest stable model for best accuracy |
| QStash `retries: 3` | Pipeline steps are idempotent; automatic retries handle transient R2/OpenAI/Anthropic failures |
| No barrel for `src/lib/queue/` or `src/lib/ai/` | Prevents server-only imports from leaking into client bundles |

---

## Validation Gates

```bash
npx tsc --noEmit   # ✅ zero errors
npm run build      # ✅ clean build — /api/internal/process in route manifest
npm run lint       # ✅ no violations
```

---

## Testing Checklist

### Automated
- [x] `npx tsc --noEmit` passes
- [x] `npm run build` passes

### Manual (once 07c is complete)
- [ ] Upload audio → session status transitions `CREATED → UPLOADED → PROCESSING → COMPLETED`
- [ ] `GET /api/sessions/:id` returns transcript and insights after processing
- [ ] Webhook returns 200 on valid QStash signature
- [ ] Webhook returns 401 on missing/invalid signature
- [ ] Webhook returns 400 on missing `sessionId`
- [ ] Audio deleted from R2 after transcription (`audioDeletedAt` set)
- [ ] Session status set to `FAILED` if Whisper or Claude call fails
- [ ] QStash trigger fires immediately after `POST /api/sessions` succeeds

---

## Deployment Notes

### New Dependencies
```bash
npm install @upstash/qstash openai
```

### New Environment Variables

| Variable | Required | Description |
|---|---|---|
| `QSTASH_TOKEN` | Yes (for pipeline) | Upstash QStash publish token |
| `QSTASH_CURRENT_SIGNING_KEY` | Yes (for pipeline) | Webhook signature verification — current key |
| `QSTASH_NEXT_SIGNING_KEY` | Yes (for pipeline) | Webhook signature verification — next key (rotation) |
| `OPENAI_API_KEY` | Yes (for pipeline) | Whisper transcription API key |
| `ANTHROPIC_API_KEY` | Yes (for pipeline) | Claude analysis API key |

All five vars are optional in the Zod schema but required at runtime when the pipeline runs. The app starts without them; the webhook will throw a descriptive error if called with missing vars.

### Database
No new migrations required. Uses `SpeakingSession.status`, `Transcript`, and `Insight` models added in PACKET-02.

### QStash Setup
The webhook endpoint (`/api/internal/process`) must be reachable from the internet. In development, use the QStash local development proxy or expose the local server via a tunnel (e.g., ngrok).
