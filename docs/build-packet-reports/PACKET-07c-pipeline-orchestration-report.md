# Build Report — PACKET-07c: Pipeline Orchestration + Pattern Profiles

**Author:** Senior Engineer
**Date:** 2026-02-18
**Branch:** `feature/processing-pipeline`
**Version:** `0.7.0`
**Status:** ✅ COMPLETE (07c of 07a/07b/07c) — PACKET-07 fully shipped

---

## Executive Summary

PACKET-07c is complete. The 15-step async processing webhook is live at `/api/internal/process`, the pattern profile aggregator is wired in, and the sessions API now fires the QStash job after a successful upload. The full pipeline — upload → enqueue → transcribe → analyze → store → done — is operational. All validation gates pass.

---

## Definition of Done — 07c Checklist

| Requirement | Status | Notes |
|---|---|---|
| `src/app/api/internal/process/route.ts` created | ✅ | 15-step QStash webhook |
| `src/features/session/updatePatternProfile.ts` created | ✅ | Pattern upsert utility |
| `src/app/api/sessions/route.ts` modified — TODO replaced | ✅ | `await enqueueProcessing(updatedSession.id)` |
| QStash signature verification — present, 401 on failure | ✅ | `getReceiver().verify({ signature, body })` |
| Body parsed once — no stream re-read | ✅ | `await request.text()` called once |
| `sessionId` accessible in catch block | ✅ | Declared as `let sessionId: string \| null` before try |
| Const `id` for closure safety in `.map()` | ✅ | Fixes TypeScript narrowing in createMany callback |
| `SessionStatus` enum from `@prisma/client` | ✅ | Not a string union |
| Session status validation — UPLOADED guard | ✅ | Returns 400 `INVALID_STATE` if wrong state |
| All Prisma field names match schema exactly | ✅ | `audioUrl`, `audioDeletedAt`, `focusNext`, `wordCount`, `errorMessage` |
| `Prisma.JsonNull` for nullable `examples` field | ✅ | `string[] \| null` → `Prisma.JsonNull` for JSON? field |
| Audio deleted after transcription | ✅ | Step 9 — `deleteAudio` + `audioDeletedAt` |
| `Transcript` created with `wordCount` | ✅ | Whitespace-split word count |
| Up to 5 insights stored via `createMany` | ✅ | Bounded by Zod schema in 07b |
| `focusNext` stored on session | ✅ | Step 13 |
| Pattern profile upserted | ✅ | Step 14 — `updatePatternProfile(userId, insights)` |
| Session marked `DONE` after profile update | ✅ | Step 15 |
| Error handling — FAILED + `errorMessage` | ✅ | Catch block covers all steps |
| No new dependencies installed | ✅ | All from 07a/07b |
| `npx tsc --noEmit` — zero errors | ✅ | Two fixes applied (see Deviations) |
| `npm run build` — clean build | ✅ | `/api/internal/process` in route manifest |

---

## What Was Built

### `src/app/api/internal/process/route.ts` — Pipeline Webhook

**Signature verification**
- Reads `upstash-signature` header — returns 401 if absent
- `getReceiver().verify({ signature, body })` — returns 401 if invalid
- `getReceiver()` uses the lazy singleton pattern (deviation from packet — see below)

**Pipeline (happy path)**

| Step | Action | DB/API call |
|---|---|---|
| 1 | Verify QStash signature | `receiver.verify()` |
| 2 | Parse body, extract `sessionId` | — |
| 3 | Fetch session | `prisma.speakingSession.findUnique` |
| 4 | Guard: status must be `UPLOADED` | — |
| 5 | Download audio | `getAudio(audioUrl)` → R2 |
| 6 | Mark `TRANSCRIBING` | `prisma.speakingSession.update` |
| 7 | Transcribe audio | `transcribeAudio(buffer, filename)` → Whisper |
| 8 | Store transcript | `prisma.transcript.create` (with `wordCount`) |
| 9 | Delete audio + set `audioDeletedAt` | `deleteAudio()` → R2 + `prisma.speakingSession.update` |
| 10 | Mark `ANALYZING` | `prisma.speakingSession.update` |
| 11 | Analyze transcript | `analyzeTranscript(text)` → Claude |
| 12 | Store insights | `prisma.insight.createMany` |
| 13 | Store `focusNext` | `prisma.speakingSession.update` |
| 14 | Update pattern profile | `updatePatternProfile(userId, insights)` |
| 15 | Mark `DONE` | `prisma.speakingSession.update` |

**Error path**
- Any thrown error triggers the catch block
- If `sessionId` is set (parsing succeeded), session is updated: `status: FAILED`, `errorMessage: error.message`
- Returns HTTP 500 `PROCESSING_ERROR`

---

### `src/features/session/updatePatternProfile.ts` — Pattern Aggregator

- Fetches existing `PatternProfile` for the user (if any)
- Casts `existing.patterns` as `Record<string, number>` via double `as unknown as` cast
- Iterates insights and increments counters with keys like `"grammar:Missing articles"`
- Upserts the profile (`create` on first session, `update` on subsequent)

---

### `src/app/api/sessions/route.ts` — QStash Trigger

Replaced one line:
```diff
- // TODO: Trigger QStash processing pipeline (PACKET-07)
+ // Trigger QStash processing pipeline
+ await enqueueProcessing(updatedSession.id);
```
Added one import: `import { enqueueProcessing } from '@/lib/queue/qstash';`

---

## Deviations from Packet Instructions

| Deviation | Reason |
|---|---|
| Lazy singleton `getReceiver()` instead of module-level `const receiver` | Consistent with all other clients in the codebase. Module-level `requireEnv` calls would throw at first import if signing keys are absent — lazy initialization is safer for deployments without these vars |
| `const id = sessionId` — local const after narrowing | `sessionId` is `string \| null`; TypeScript doesn't narrow `let` variables inside `.map()` closures. `const id` is safely typed as `string` for use in createMany callback |
| `Prisma.JsonNull` instead of `null` for `examples` | Prisma's `createMany` input type for `Json?` fields uses `NullableJsonNullValueInput \| InputJsonValue`, not `null`. Fixes TS2322 type error |

---

## Validation Output

### `npx tsc --noEmit`
```
(no output — clean pass)
Exit code: 0
```

### `npm run build`
```
✓ Compiled successfully in 5.4s
✓ Generating static pages (10/10)
Route manifest includes: ƒ /api/internal/process
Exit code: 0
```

---

## Known Issues / Technical Debt

| ID | Severity | Description | Recommended Action |
|---|---|---|---|
| TD-25 | Medium | Pattern profile cast `as unknown as Record<string, number>` is not runtime-safe | Add a Zod schema to validate the shape of `patterns` on read |
| TD-26 | Low | `wordCount` uses simple whitespace split — inaccurate for contractions and punctuation | Use a proper word tokenizer (e.g., split on `\b\w+\b`) for more accurate counts |
| TD-27 | Low | `console.error` in catch block — follows existing pattern in sessions/route.ts but not structured logging | Replace with structured logger (e.g., pino) in a future observability pass |
| TD-28 | Medium | If Steps 13–15 fail after insights are stored, re-runs will duplicate insights on retry | Add idempotency guard: check if `Transcript` already exists before Step 8 |

---

## PACKET-07 Complete — Prerequisites for PACKET-08

1. ✅ `GET /api/sessions/:id` returns `transcript` and `insights` (already implemented in PACKET-06b)
2. ✅ `SpeakingSession.status` transitions to `DONE` — results page can poll for completion
3. ✅ `SpeakingSession.focusNext` populated after processing
4. ✅ Up to 5 `Insight` records per session with `category`, `pattern`, `severity`, `examples`, `suggestion`
5. ✅ `SessionStatus` enum values: `CREATED`, `UPLOADED`, `TRANSCRIBING`, `ANALYZING`, `DONE`, `FAILED`
