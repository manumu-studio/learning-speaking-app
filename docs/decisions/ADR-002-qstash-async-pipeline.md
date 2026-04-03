# ADR-002: QStash for async session processing

**Date:** 2026-04-03  
**Status:** Accepted  

## Context

Transcription (Whisper) and analysis (Claude) exceed comfortable latency for a single serverless invocation. Vercel functions have time limits; users need fast upload feedback while work continues in the background. Retries and at-least-once delivery matter when external APIs blip.

## Decision

After a session is stored and audio is in R2, **`enqueueProcessing`** in `src/lib/queue/qstash.ts` publishes a signed QStash message. The webhook **`POST /api/internal/process`** (`src/app/api/internal/process/route.ts`) verifies `upstash-signature`, parses `{ sessionId }`, and runs **`executePipeline`** from `src/lib/pipeline`. In **development**, **`POST /api/dev/process`** skips signature verification and runs the same pipeline when `NODE_ENV === 'development'`.

## Alternatives considered

- **Synchronous pipeline in the upload request** — simplest but slow uploads and fragile under timeouts.
- **Database polling workers** — more moving parts (worker deploy, lease semantics) for a small team.
- **Vercel Cron only** — poor fit for event-driven per-session work.
- **Separate long-running container** — higher ops cost than managed queue + serverless handler.

## Consequences

- **Pros:** Decoupled upload from AI latency; QStash retries; signature verification isolates the webhook.
- **Cons:** QStash signing keys are optional in `lib/env` Zod schema but **required at runtime** for production webhooks — misconfiguration fails loudly in the receiver.
- **Failure path:** `isQstashFinalFailureAttempt` + `persistSessionFailedStatus` mark sessions failed after final retry (`src/app/api/internal/process/route.ts`).
