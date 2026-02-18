# Build Report — PACKET-07a: QStash Client + Whisper STT Client

**Author:** Senior Engineer
**Date:** 2026-02-18
**Branch:** `feature/processing-pipeline`
**Version:** `0.7.0`
**Status:** ✅ COMPLETE (07a of 07a/07b/07c)

---

## Executive Summary

PACKET-07a is complete. The QStash async job client and OpenAI Whisper transcription client are in place, following the same lazy singleton + runtime validation pattern established by `r2.ts` in PACKET-06a. Both clients are compile-safe, test-safe (no boot-time crashes when env vars are absent), and ready to be consumed by the webhook handler in PACKET-07c.

---

## Definition of Done — 07a Checklist

| Requirement | Status | Notes |
|---|---|---|
| `src/lib/queue/qstash.ts` created | ✅ | Lazy singleton QStash client |
| `src/lib/ai/whisper.ts` created | ✅ | Lazy singleton OpenAI client |
| `enqueueProcessing(sessionId)` exported | ✅ | Publishes to `${APP_URL}/api/internal/process` |
| `transcribeAudio(buffer, filename)` exported | ✅ | Returns transcript string |
| Both use `requireEnv()` runtime validation | ✅ | Throws descriptive error if vars absent |
| Lazy singleton — no build-time crashes | ✅ | `_client` initialized on first call |
| No `!` non-null assertions | ✅ | `requireEnv()` replaces all assertions |
| No `process.env` access | ✅ | All env via `@/lib/env` |
| `env.ts` not modified | ✅ | All vars already present |
| `r2.ts` not modified | ✅ | Packet scope respected |
| `@upstash/qstash` installed | ✅ | Added to `package.json` |
| `openai` installed | ✅ | Added to `package.json` |
| `npx tsc --noEmit` — zero errors | ✅ | Required Buffer→ArrayBuffer fix |
| `npm run build` — clean build | ✅ | All routes compiled |

---

## What Was Built

### `src/lib/queue/qstash.ts` — QStash Job Client

A module-scoped singleton wrapping the `@upstash/qstash` `Client`. On first call to `getQStashClient()`, `QSTASH_TOKEN` is validated via `requireEnv()` and the client is instantiated. Subsequent calls return the cached instance.

**`enqueueProcessing(sessionId: string): Promise<void>`**
- Publishes a JSON payload `{ sessionId }` to `${APP_URL}/api/internal/process`
- Configured with `retries: 3` — QStash will retry on non-2xx response
- The endpoint (`/api/internal/process`) is created in PACKET-07c

---

### `src/lib/ai/whisper.ts` — Whisper Transcription Client

A module-scoped singleton wrapping the `openai` `OpenAI` client. Same lazy initialization pattern as the QStash client.

**`transcribeAudio(audioBuffer: Buffer, filename: string): Promise<string>`**
- Converts `Buffer` → plain `ArrayBuffer` via `.buffer.slice(byteOffset, byteOffset + byteLength)` to satisfy `BlobPart` type constraint under strict TypeScript
- Wraps the ArrayBuffer in a `File` object with `type: 'audio/webm'`
- Calls `client.audio.transcriptions.create({ model: 'whisper-1', file, language: 'en' })`
- Returns `response.text` — the raw transcript string

---

## Deviations from Packet Instructions

| Deviation | Reason |
|---|---|
| `buffer.buffer.slice(byteOffset, ...)` instead of `new File([audioBuffer], ...)` | `Buffer.buffer` is typed `ArrayBufferLike` (not `ArrayBuffer`), which is incompatible with `BlobPart` under strict TypeScript. Slicing produces a guaranteed plain `ArrayBuffer`. |

---

## Validation Output

### `npx tsc --noEmit`
```
(no output — clean pass)
Exit code: 0
```

### `npm run build`
```
✓ Compiled successfully in 2.8s
✓ Generating static pages (9/9)
Exit code: 0
```

---

## Known Issues / Technical Debt

| ID | Severity | Description | Recommended Action |
|---|---|---|---|
| TD-19 | Low | `audio/webm` MIME type is hardcoded in `whisper.ts` | Infer from `filename` extension if multi-format support is added later |
| TD-20 | Low | QStash `retries: 3` is hardcoded | Move to a named constant or env var if retry policy needs tuning |

---

## Prerequisites for PACKET-07b

1. ✅ `ANTHROPIC_API_KEY` already present (optional) in `src/lib/env.ts`
2. ✅ Lazy singleton pattern established — 07b Claude client follows the same shape
3. ✅ Both 07a clients importable from `@/lib/queue/qstash` and `@/lib/ai/whisper`

## Prerequisites for PACKET-07c

1. ✅ `enqueueProcessing(sessionId)` ready for use in `POST /api/sessions`
2. ✅ `transcribeAudio(buffer, filename)` ready for use in webhook handler
3. ✅ `QSTASH_CURRENT_SIGNING_KEY` and `QSTASH_NEXT_SIGNING_KEY` already in `env.ts` for signature verification
