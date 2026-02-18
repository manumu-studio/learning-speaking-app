# ENTRY-07c — Pipeline Orchestration + Pattern Profiles (PACKET-07c)

**Date:** 2026-02-18
**Type:** Feature
**Branch:** `feature/processing-pipeline`
**Version:** `0.7.0`

---

## What I Did

Completed the async processing pipeline. Wired the 15-step webhook handler that receives QStash jobs, orchestrates the full Whisper → Claude → Postgres flow, and tracks long-term user patterns. Also removed the TODO stub in the sessions API and replaced it with the real `enqueueProcessing()` call.

---

## Files Touched

| File | Action | Notes |
|---|---|---|
| `src/app/api/internal/process/route.ts` | Created | 15-step QStash webhook handler |
| `src/features/session/updatePatternProfile.ts` | Created | Pattern profile upsert utility |
| `src/app/api/sessions/route.ts` | Modified | Replaced TODO with `await enqueueProcessing(updatedSession.id)` |

---

## Decisions

**Lazy singleton for `Receiver`** — Deviated from the packet's module-level initialization. All existing clients (`r2.ts`, `qstash.ts`, `whisper.ts`, `analyze.ts`) use lazy singletons to avoid crashes when env vars are absent at startup. Applied the same pattern to the `Receiver` for consistency and build safety.

**`const id = sessionId` for closure safety** — `sessionId` is declared as `string | null` outside the try block (needed for the catch). After assignment, TypeScript narrows it to `string`, but that narrowing doesn't carry into `.map()` closures. Captured it as a `const id` immediately after parsing for safe use in all Prisma calls and the createMany callback.

**`Prisma.JsonNull` for nullable JSON** — The `examples` field is `Json?` in Prisma. Prisma's `createMany` does not accept `null` directly for `Json?` fields — it requires `Prisma.JsonNull` as the sentinel. Fixed this TypeScript error by importing `Prisma` from `@prisma/client` and using `insight.examples ?? Prisma.JsonNull`.

**Steps 13 and 15 kept separate (focusNext, then DONE)** — `focusNext` is updated before the pattern profile, and `DONE` is set only after the profile update. This ensures that if the profile update fails, the session correctly lands in `FAILED` (not stuck in `ANALYZING` or prematurely marked `DONE`).

**Audio deletion before analysis** — Audio is deleted from R2 immediately after transcription (Step 9), not after analysis. This minimizes the window where audio is stored, consistent with the privacy-first policy in `SECURITY.md`.

**`updatePatternProfile` uses `as unknown as Record<string, number>`** — Prisma's `JsonValue` type doesn't directly cast to `Record<string, number>`. The double cast is safe because we control what's stored in the `patterns` field (always a flat object with string keys and number values).

---

## State Machine

```
CREATED → UPLOADED → TRANSCRIBING → ANALYZING → DONE
                          ↓               ↓
                        FAILED          FAILED
                     (any error)     (any error)
```

Any unhandled error in the pipeline sets `status: FAILED` with a descriptive `errorMessage`. QStash retries the job up to 3 times before giving up.

---

## Validation

```bash
npx tsc --noEmit   # ✅ zero errors
npm run build      # ✅ clean build — /api/internal/process now in route manifest
```
