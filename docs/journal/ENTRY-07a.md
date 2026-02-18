# ENTRY-07a — QStash Client + Whisper STT Client (PACKET-07a)

**Date:** 2026-02-18
**Type:** Feature
**Branch:** `feature/processing-pipeline`
**Version:** `0.7.0`

---

## What I Did

Built the infrastructure layer for the async processing pipeline — a QStash client for enqueuing jobs and an OpenAI Whisper client for audio transcription. These are the foundational building blocks before the webhook handler (07c) wires everything together.

---

## Files Touched

| File | Action | Notes |
|---|---|---|
| `src/lib/queue/qstash.ts` | Created | QStash client with `enqueueProcessing(sessionId)` — lazy singleton |
| `src/lib/ai/whisper.ts` | Created | Whisper STT client with `transcribeAudio(buffer, filename)` — lazy singleton |

---

## Decisions

**Lazy singleton pattern** — Both clients follow the same lazy initialization + runtime validation pattern already established in `r2.ts`. Client objects are created on first use, not at import time, so the app can boot in environments where `QSTASH_TOKEN` or `OPENAI_API_KEY` are absent. A `requireEnv()` helper throws descriptive errors if vars are missing at call time.

**`requireEnv()` over `!` assertions** — Both env vars are `optional()` in `env.ts` (Zod strips undefined). Non-null assertions would hide the runtime error; `requireEnv()` throws explicitly and names the missing variable.

**Buffer → ArrayBuffer conversion** — TypeScript strict mode rejects `Buffer` as a `BlobPart` because `Buffer.buffer` is typed `ArrayBufferLike` (which includes `SharedArrayBuffer`). Used `.buffer.slice(byteOffset, byteOffset + byteLength)` to produce a plain `ArrayBuffer` before constructing the `File` object. The `as ArrayBuffer` cast is safe here because `slice()` on a `Buffer` always returns a copy as a plain `ArrayBuffer`.

**`whisper-1` with `language: 'en'`** — English hint reduces hallucinations and improves accuracy for learner speech. Model is the latest stable Whisper release.

**`audio/webm` MIME type** — Matches the format produced by `MediaRecorder` in the frontend. If the recording format changes, only this line needs updating.

**No barrel for `src/lib/queue/` or `src/lib/ai/`** — Consistent with the decision made in PACKET-06a to avoid barrel exports in `src/lib/`. Consumers import directly from the module file.

---

## Validation

```bash
npx tsc --noEmit   # ✅ zero errors
npm run build      # ✅ clean build
```
