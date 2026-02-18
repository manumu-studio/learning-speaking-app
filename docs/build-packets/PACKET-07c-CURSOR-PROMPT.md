# PACKET-07c: Pipeline Orchestration + Pattern Profile Updater + Wire QStash

**Recommended model**: Sonnet 4.6 Thinking

---

You are building PACKET-07c for the Learning Speaking App. Follow all rules in `.cursorrules`.

## Scope

**Files to CREATE:**
- `src/app/api/internal/process/route.ts` — Webhook handler for async processing
- `src/features/session/updatePatternProfile.ts` — Pattern profile aggregator

**Files to MODIFY:**
- `src/app/api/sessions/route.ts` — Replace TODO with QStash enqueue call

**Dependencies to install:** NONE (all dependencies already installed in 07a/07b)

---

## CRITICAL: Use EXACT Prisma Field Names

### SessionStatus enum (import from @prisma/client)
```typescript
enum SessionStatus {
  CREATED
  UPLOADED
  TRANSCRIBING
  ANALYZING
  DONE
  FAILED
}
```

### SpeakingSession fields
```typescript
{
  id: string
  userId: string
  status: SessionStatus
  audioUrl: string?
  audioDeletedAt: DateTime?
  focusNext: string? @db.Text
  errorMessage: string?
  // ... other fields
}
```

### Transcript fields
```typescript
{
  id: string
  sessionId: string (unique)
  text: string @db.Text
  wordCount: int?
}
```

### Insight fields
```typescript
{
  id: string
  sessionId: string
  category: string
  pattern: string
  detail: string @db.Text
  frequency: int?
  severity: string?
  examples: Json?
  suggestion: string? @db.Text
}
```

### PatternProfile fields
```typescript
{
  id: string
  userId: string (unique)
  patterns: Json
  focusAreas: Json?
  lastUpdated: DateTime
}
```

---

## File 1: `src/features/session/updatePatternProfile.ts`

```typescript
// Utility for aggregating pattern insights into user pattern profiles
import { prisma } from '@/lib/prisma';

interface Insight {
  category: string;
  pattern: string;
  frequency?: number;
}

/**
 * Update user's pattern profile with new insights from session
 * @param userId - User ID from session
 * @param insights - Array of insights from Claude analysis
 */
export async function updatePatternProfile(
  userId: string,
  insights: Insight[]
): Promise<void> {
  const existing = await prisma.patternProfile.findUnique({
    where: { userId },
  });

  const patterns = (existing?.patterns as Record<string, number>) ?? {};

  // Increment pattern counters
  for (const insight of insights) {
    const key = `${insight.category}:${insight.pattern}`;
    patterns[key] = (patterns[key] ?? 0) + (insight.frequency ?? 1);
  }

  await prisma.patternProfile.upsert({
    where: { userId },
    create: {
      userId,
      patterns,
      lastUpdated: new Date(),
    },
    update: {
      patterns,
      lastUpdated: new Date(),
    },
  });
}
```

---

## File 2: `src/app/api/internal/process/route.ts`

```typescript
// Webhook handler for async session processing (QStash → Whisper → Claude → DB)
import { NextRequest, NextResponse } from 'next/server';
import { Receiver } from '@upstash/qstash';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import { SessionStatus } from '@prisma/client';
import { transcribeAudio } from '@/lib/ai/whisper';
import { analyzeTranscript } from '@/lib/ai/analyze';
import { updatePatternProfile } from '@/features/session/updatePatternProfile';
import { getAudio, deleteAudio } from '@/lib/storage/r2';

// Runtime validation for QStash signing keys
function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const currentSigningKey = requireEnv(
  env.QSTASH_CURRENT_SIGNING_KEY,
  'QSTASH_CURRENT_SIGNING_KEY'
);
const nextSigningKey = requireEnv(
  env.QSTASH_NEXT_SIGNING_KEY,
  'QSTASH_NEXT_SIGNING_KEY'
);

const receiver = new Receiver({
  currentSigningKey,
  nextSigningKey,
});

export async function POST(request: NextRequest) {
  let sessionId: string | null = null;

  try {
    // Step 1: Verify QStash signature
    const signature = request.headers.get('upstash-signature');
    const body = await request.text();

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const isValid = await receiver.verify({ signature, body });
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid signature', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Step 2: Parse body ONCE (store sessionId for error handling)
    const parsed = JSON.parse(body) as { sessionId: string };
    sessionId = parsed.sessionId;

    // Step 3: Fetch session
    const session = await prisma.speakingSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Step 4: Validate status is UPLOADED
    if (session.status !== SessionStatus.UPLOADED) {
      return NextResponse.json(
        { error: 'Session already processed or in wrong state', code: 'INVALID_STATE' },
        { status: 400 }
      );
    }

    if (!session.audioUrl) {
      throw new Error('Session missing audio URL');
    }

    // Step 5: Download audio from R2
    const audioBuffer = await getAudio(session.audioUrl);

    // Step 6: Update status to TRANSCRIBING
    await prisma.speakingSession.update({
      where: { id: sessionId },
      data: { status: SessionStatus.TRANSCRIBING },
    });

    // Step 7: Transcribe audio
    const transcriptText = await transcribeAudio(
      audioBuffer,
      `session-${sessionId}.webm`
    );

    // Step 8: Create transcript record
    const wordCount = transcriptText.trim().split(/\s+/).length;
    await prisma.transcript.create({
      data: {
        sessionId,
        text: transcriptText,
        wordCount,
      },
    });

    // Step 9: Delete audio from R2 and update audioDeletedAt
    await deleteAudio(session.audioUrl);
    await prisma.speakingSession.update({
      where: { id: sessionId },
      data: { audioDeletedAt: new Date() },
    });

    // Step 10: Update status to ANALYZING
    await prisma.speakingSession.update({
      where: { id: sessionId },
      data: { status: SessionStatus.ANALYZING },
    });

    // Step 11: Analyze transcript with Claude
    const analysis = await analyzeTranscript(transcriptText);

    // Step 12: Create insights
    await prisma.insight.createMany({
      data: analysis.insights.map((insight) => ({
        sessionId,
        category: insight.category,
        pattern: insight.pattern,
        detail: insight.detail,
        frequency: insight.frequency ?? null,
        severity: insight.severity ?? null,
        examples: insight.examples ?? null,
        suggestion: insight.suggestion ?? null,
      })),
    });

    // Step 13: Update session with focusNext
    await prisma.speakingSession.update({
      where: { id: sessionId },
      data: { focusNext: analysis.focusNext },
    });

    // Step 14: Update pattern profile
    await updatePatternProfile(session.userId, analysis.insights);

    // Step 15: Mark as DONE
    await prisma.speakingSession.update({
      where: { id: sessionId },
      data: { status: SessionStatus.DONE },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    // Error handling: mark session as FAILED
    if (sessionId) {
      await prisma.speakingSession.update({
        where: { id: sessionId },
        data: {
          status: SessionStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }

    console.error('Processing pipeline error:', error);
    return NextResponse.json(
      { error: 'Processing failed', code: 'PROCESSING_ERROR' },
      { status: 500 }
    );
  }
}
```

---

## File 3: MODIFY `src/app/api/sessions/route.ts`

Find this line (around line 76):

```typescript
// TODO: Trigger QStash processing pipeline (PACKET-07)
```

**Replace it with:**

```typescript
// Trigger QStash processing pipeline
await enqueueProcessing(updatedSession.id);
```

**Add this import at the top:**

```typescript
import { enqueueProcessing } from '@/lib/queue/qstash';
```

---

## Validation

After modifying these files, run:

```bash
npx tsc --noEmit
npm run build
```

Both commands must succeed with zero errors.

---

## Key Implementation Notes

1. **Parse body ONCE**: The request body is parsed once at the top and `sessionId` is stored in a variable accessible to both the `try` and `catch` blocks. This prevents the error where we try to re-read the body stream (which can only be read once).

2. **SessionStatus enum**: Imported from `@prisma/client`. Use `SessionStatus.UPLOADED`, `SessionStatus.TRANSCRIBING`, etc.

3. **Error handling**: On any error, mark session as `FAILED` with `errorMessage`. This prevents sessions from getting stuck in intermediate states.

4. **Audio deletion**: Audio is deleted from R2 immediately after transcription (privacy + cost optimization). `audioDeletedAt` is set in the DB.

5. **Field names match Prisma EXACTLY**:
   - `audioUrl` (not `audio_url`)
   - `audioDeletedAt` (not `audio_deleted_at`)
   - `focusNext` (not `focus_next`)
   - `wordCount` (not `word_count`)
   - `errorMessage` (not `error_message`)

6. **Pattern profile aggregation**: Uses `upsert` to either create or update the user's pattern profile. Patterns are stored as JSON with keys like `"grammar:Missing articles"`.

---

## Documentation

### Journal Entry: `docs/journal/ENTRY-07c.md`

```markdown
# ENTRY-07c — Pipeline Orchestration + Pattern Profiles

**Date**: 2026-02-18
**Type**: Feature
**Branch**: feature/processing-pipeline
**Version**: 0.7.0

## Summary

Completed async processing pipeline with webhook handler, pattern profile updater, and QStash trigger integration.

## Files Created

- `src/app/api/internal/process/route.ts` — Webhook handler (15-step pipeline)
- `src/features/session/updatePatternProfile.ts` — Pattern aggregation utility

## Files Modified

- `src/app/api/sessions/route.ts` — Added QStash enqueue call after session upload

## Key Decisions

1. **15-step pipeline**:
   - Signature verification
   - Session validation
   - Audio download from R2
   - Status: UPLOADED → TRANSCRIBING
   - Whisper transcription
   - Transcript storage + audio deletion
   - Status: TRANSCRIBING → ANALYZING
   - Claude analysis
   - Insights storage
   - FocusNext update
   - Pattern profile aggregation
   - Status: ANALYZING → DONE
   - Error handling: any failure → FAILED with errorMessage

2. **Parse body once**: Request body is read once at the top and stored in a variable for both try/catch blocks (prevents stream re-read errors).

3. **Audio deletion**: Audio deleted immediately after transcription (privacy + cost). `audioDeletedAt` timestamp recorded in DB.

4. **Pattern profile**: Uses `upsert` to create or update. Patterns stored as JSON with keys like `"grammar:Missing articles"` and values as occurrence counts.

5. **Error resilience**: Any error in pipeline marks session as FAILED with detailed errorMessage. QStash will retry up to 3 times.

## State Machine

```
CREATED → UPLOADED → TRANSCRIBING → ANALYZING → DONE
                ↓          ↓           ↓
              FAILED     FAILED      FAILED
```

## Next Steps

- PACKET-08: Build results UI to display insights and focusNext
- PACKET-09: Add history page and GDPR consent management
```

### Build Report: `docs/build-packet-reports/PACKET-07a-qstash-whisper-report.md`

```markdown
# Build Report: PACKET-07a — QStash + Whisper

**Date**: 2026-02-18
**Branch**: feature/processing-pipeline
**Version**: 0.7.0

## What Was Built

✅ QStash client with `enqueueProcessing()` function
✅ Whisper STT client with `transcribeAudio()` function

## Files Created

- `src/lib/queue/qstash.ts` (30 lines)
- `src/lib/ai/whisper.ts` (40 lines)

## Dependencies Added

- `@upstash/qstash@^2.0.0`
- `openai@^4.0.0`

## Validation

```bash
✅ npx tsc --noEmit (0 errors)
✅ npm run build (success)
```

## Testing Notes

- QStash client uses lazy singleton pattern (consistent with r2.ts)
- Whisper client converts Buffer to File object for API
- Runtime validation prevents build-time crashes when env vars missing
```

### Build Report: `docs/build-packet-reports/PACKET-07b-claude-analysis-report.md`

```markdown
# Build Report: PACKET-07b — Claude Analysis

**Date**: 2026-02-18
**Branch**: feature/processing-pipeline
**Version**: 0.7.0

## What Was Built

✅ Claude Haiku client with pattern analysis prompt
✅ Zod schema matching Prisma models EXACTLY
✅ Type-safe analysis function

## Files Created

- `src/lib/ai/analyze.ts` (150 lines)

## Dependencies Added

- `@anthropic-ai/sdk@^0.30.0`

## Key Features

- Pattern-focused analysis (not sentence correction)
- Max 5 insights per session
- Zod validation ensures schema matches Prisma
- Uses Claude Haiku 4.5 for cost efficiency

## Validation

```bash
✅ npx tsc --noEmit (0 errors)
✅ npm run build (success)
```

## Testing Notes

- Prompt instructs Claude to return JSON-only (no markdown)
- Schema validates category, pattern, detail, frequency, severity, examples, suggestion
- focusNext provides ONE concrete goal for next session
```

### Build Report: `docs/build-packet-reports/PACKET-07c-pipeline-orchestration-report.md`

```markdown
# Build Report: PACKET-07c — Pipeline Orchestration

**Date**: 2026-02-18
**Branch**: feature/processing-pipeline
**Version**: 0.7.0

## What Was Built

✅ 15-step async processing webhook
✅ Pattern profile aggregator
✅ QStash trigger integration in sessions API

## Files Created

- `src/app/api/internal/process/route.ts` (150 lines)
- `src/features/session/updatePatternProfile.ts` (35 lines)

## Files Modified

- `src/app/api/sessions/route.ts` (replaced TODO with enqueue call)

## Pipeline Flow

1. QStash signature verification
2. Session validation (status must be UPLOADED)
3. Audio download from R2
4. Status update: TRANSCRIBING
5. Whisper transcription
6. Transcript storage (with wordCount)
7. Audio deletion from R2 (+ audioDeletedAt timestamp)
8. Status update: ANALYZING
9. Claude analysis
10. Insights storage (up to 5 per session)
11. FocusNext update
12. Pattern profile aggregation
13. Status update: DONE
14. Error handling: FAILED with errorMessage
15. Return 200 OK

## Validation

```bash
✅ npx tsc --noEmit (0 errors)
✅ npm run build (success)
```

## Testing Notes

- Body parsed once (prevents stream re-read errors)
- SessionStatus enum imported from @prisma/client
- All field names match Prisma schema exactly
- Error handling marks session as FAILED (prevents stuck states)
```

### PR Documentation: `docs/pull-requests/PR-0.7.0.md`

```markdown
# PR-0.7.0 — Async Processing Pipeline

**Branch**: `feature/processing-pipeline`
**Base**: `main`
**Date**: 2026-02-18

## Summary

Implemented async processing pipeline for speaking sessions using QStash, Whisper, and Claude. Sessions progress through state machine: UPLOADED → TRANSCRIBING → ANALYZING → DONE (or FAILED on error).

## What Was Built

### Infrastructure
- QStash client for async job queuing
- Whisper STT client for audio transcription
- Claude Haiku client for pattern analysis
- 15-step webhook handler at `/api/internal/process`
- Pattern profile aggregator

### State Machine
```
CREATED → UPLOADED → TRANSCRIBING → ANALYZING → DONE
                ↓          ↓           ↓
              FAILED     FAILED      FAILED
```

### Key Features
- Async processing with 3 retries
- Audio deletion after transcription (privacy + cost)
- Pattern-focused feedback (not sentence correction)
- Max 5 insights per session
- Pattern profile tracks recurring issues across sessions
- Detailed error messages for failed sessions

## Files Created
- `src/lib/queue/qstash.ts`
- `src/lib/ai/whisper.ts`
- `src/lib/ai/analyze.ts`
- `src/app/api/internal/process/route.ts`
- `src/features/session/updatePatternProfile.ts`

## Files Modified
- `src/app/api/sessions/route.ts` (added QStash enqueue call)

## Dependencies Added
- `@upstash/qstash@^2.0.0`
- `openai@^4.0.0`
- `@anthropic-ai/sdk@^0.30.0`

## Architecture Decisions

1. **QStash for async processing**: Decouples upload from processing. Processing can take 30-60s (Whisper + Claude), so async is essential for good UX.

2. **Whisper for STT**: Industry standard, high accuracy, supports 30+ languages (future-proof for internationalization).

3. **Claude Haiku for analysis**: Fast and cost-effective for MVP. Can upgrade to Sonnet if higher-quality feedback is needed.

4. **Pattern profiles**: Aggregates insights across sessions to track long-term progress and recurring issues.

5. **Audio deletion**: Privacy-first design. Audio deleted immediately after transcription. Transcript stored for analysis.

6. **State machine**: Clear status tracking. FAILED state prevents sessions from getting stuck. Detailed errorMessage aids debugging.

## Testing

### Manual Testing Checklist
- [ ] Upload audio → session created with UPLOADED status
- [ ] QStash webhook triggered → signature verified
- [ ] Status changes: UPLOADED → TRANSCRIBING → ANALYZING → DONE
- [ ] Transcript stored in DB with wordCount
- [ ] Audio deleted from R2 (audioDeletedAt set)
- [ ] Insights stored (max 5)
- [ ] focusNext field populated
- [ ] Pattern profile created/updated
- [ ] Error handling: invalid signature → 401
- [ ] Error handling: processing failure → FAILED status with errorMessage

### Validation
```bash
✅ npx tsc --noEmit (0 errors)
✅ npm run build (success)
✅ npm run lint (0 violations)
```

## Environment Variables Required

```env
QSTASH_TOKEN=xxx
QSTASH_CURRENT_SIGNING_KEY=xxx
QSTASH_NEXT_SIGNING_KEY=xxx
OPENAI_API_KEY=xxx
ANTHROPIC_API_KEY=xxx
APP_URL=https://your-domain.com (or http://localhost:3000)
```

## Deployment Notes

1. **QStash webhook endpoint**: `/api/internal/process` must be publicly accessible. Add to firewall whitelist if needed.

2. **Retry behavior**: QStash retries up to 3 times on failure. Sessions that fail all retries will have FAILED status.

3. **Cost monitoring**: Each session costs ~$0.10-0.15 (Whisper: ~$0.006/min, Claude Haiku: ~$0.10/1K tokens). Monitor usage in Upstash and Anthropic dashboards.

4. **Audio storage**: Audio files deleted after transcription. R2 storage costs should be minimal (<$1/month for MVP).

## Next Steps

- PACKET-08: Build results UI to display insights and focusNext
- PACKET-09: Add history page and GDPR consent management
- PACKET-10: Polish UI, add loading states, error handling
```

### Update Roadmap: `docs/roadmap/ROADMAP.md`

Add to completed milestones:

```markdown
## ✅ v0.7.0 — Async Processing Pipeline (2026-02-18)

- [x] QStash client for async job queuing
- [x] Whisper STT client for audio transcription
- [x] Claude Haiku client for pattern analysis
- [x] 15-step webhook handler at `/api/internal/process`
- [x] Pattern profile aggregator
- [x] State machine: UPLOADED → TRANSCRIBING → ANALYZING → DONE (or FAILED)
- [x] Audio deletion after transcription
- [x] Error handling with detailed messages
```

---

**DO NOT**:
- Parse request body twice (it's a stream, can only be read once)
- Use wrong field names (e.g., `audio_url` instead of `audioUrl`)
- Import SessionStatus as a string union (it's an enum from @prisma/client)
- Skip signature verification (security requirement)
- Install new dependencies (all already installed in 07a/07b)

**References**: See `.cursorrules` for API error formatting, TypeScript standards, and project structure.


Include documentation file creation in the  (journal, build report, PR doc, roadmap update) following this standars @_docs/journal @_docs/pull-requests @_docs/roadmap @_docs/ARCHITECTURE.md @_docs/SECURITY.md 