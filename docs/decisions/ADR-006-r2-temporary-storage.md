# ADR-006: Cloudflare R2 for temporary audio

**Date:** 2026-04-03  
**Status:** Accepted  

## Context

Users upload audio from the browser. The pipeline needs a durable hand-off between upload and serverless processing without streaming large blobs through the Next.js function body for every retry. Privacy goals require **deleting audio after transcription** rather than indefinite retention.

## Decision

Use **S3-compatible Cloudflare R2** via `@aws-sdk/client-s3` wrappers in `src/lib/storage/r2.ts`. `POST /api/sessions` uploads with a generated key (`generateAudioKey`); QStash later triggers download and processing; the pipeline deletes objects after use. Drill completion (`src/app/api/drills/[id]/complete/route.ts`) uploads a short-lived drill clip, transcribes, then deletes that key in a `finally` block.

## Alternatives considered

- **Direct browser → OpenAI multipart** — couples client to provider, complicates auth, weakens consent gating in our API.
- **Postgres bytea / app disk** — poor fit for large binaries and serverless filesystems.
- **Persistent user audio archive** — conflicts with privacy stance and storage cost.

## Consequences

- **Pros:** Cheap object storage; presigned URL pattern keeps API in control; deletion is explicit in code paths.
- **Cons:** R2 credentials and bucket configuration are required for full flows; missing env disables uploads gracefully only if features gate on config (see env validation).
- **Ops:** Keys are opaque paths; orphaned objects possible if a crash happens before delete — acceptable risk mitigated by lifecycle policies if needed later.
