# PACKET-07 — Async Processing Pipeline (QStash + Whisper + Claude)

**Recommended Model**: Sonnet 4.6 Thinking

You are building PACKET-07 for the Learning Speaking App. Follow all rules in `.cursorrules`.

---

## SCOPE

### Files to CREATE (5 files):

1. `src/lib/queue/qstash.ts` — QStash client + enqueue function
2. `src/lib/ai/whisper.ts` — Whisper STT client
3. `src/lib/ai/analyze.ts` — Claude analysis client + prompt + Zod schema
4. `src/app/api/internal/process/route.ts` — Webhook handler for async processing
5. `src/features/session/updatePatternProfile.ts` — Pattern profile aggregator

### Files to MODIFY (1 file):

- `src/app/api/sessions/route.ts` — Replace TODO with QStash enqueue call

### Dependencies to Install:

```bash
npm install @upstash/qstash openai @anthropic-ai/sdk
```

---

## CRITICAL: Prisma Schema Reference

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

**Key Points:**

- All clients use **lazy singleton pattern** (runtime validation, prevents build-time crashes when env vars are missing)
- `requireEnv()` helper validates env vars at call time, not import time
- `SessionStatus` enum imported from `@prisma/client` (not string literals)
- Field names match Prisma EXACTLY: `audioUrl`, `audioDeletedAt`, `focusNext`, `wordCount`, `errorMessage`

---

## FULL CODE FOR EACH FILE

### File 1: `src/lib/queue/qstash.ts`

```typescript
// QStash client for enqueuing async processing jobs
import { Client } from '@upstash/qstash';
import { env } from '@/lib/env';

// Runtime validation — QStash vars are optional in env.ts but required here
function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Configure QStash credentials to enable async processing.`
    );
  }
  return value;
}

// Lazy singleton — initialized on first use to avoid build-time crashes
let _qstashClient: Client | null = null;

function getQStashClient(): Client {
  if (_qstashClient) {
    return _qstashClient;
  }

  const token = requireEnv(env.QSTASH_TOKEN, 'QSTASH_TOKEN');
  _qstashClient = new Client({ token });
  return _qstashClient;
}

// Enqueue session processing job via QStash
export async function enqueueProcessing(sessionId: string): Promise<void> {
  const client = getQStashClient();
  await client.publishJSON({
    url: `${env.APP_URL}/api/internal/process`,
    body: { sessionId },
    retries: 3,
  });
}
```

---

### File 2: `src/lib/ai/whisper.ts`

```typescript
// OpenAI Whisper client for speech-to-text transcription
import OpenAI from 'openai';
import { env } from '@/lib/env';

// Runtime validation — OPENAI_API_KEY is optional in env.ts but required here
function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Configure OpenAI credentials to enable transcription.`
    );
  }
  return value;
}

// Lazy singleton — initialized on first use to avoid build-time crashes
let _openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (_openaiClient) {
    return _openaiClient;
  }

  const apiKey = requireEnv(env.OPENAI_API_KEY, 'OPENAI_API_KEY');
  _openaiClient = new OpenAI({ apiKey });
  return _openaiClient;
}

// Transcribe audio using Whisper API — audioBuffer as Buffer, filename for MIME inference
export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string
): Promise<string> {
  const client = getOpenAIClient();

  // Convert Buffer to File object for Whisper API
  const file = new File([audioBuffer], filename, { type: 'audio/webm' });

  const response = await client.audio.transcriptions.create({
    model: 'whisper-1',
    file,
    language: 'en',
  });

  return response.text;
}
```

---

### File 3: `src/lib/ai/analyze.ts`

```typescript
// Claude Haiku client for analyzing transcripts and detecting recurring patterns
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { env } from '@/lib/env';

// Runtime validation — ANTHROPIC_API_KEY is optional in env.ts but required here
function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Configure Anthropic credentials to enable analysis.`
    );
  }
  return value;
}

// Lazy singleton — initialized on first use to avoid build-time crashes
let _anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (_anthropicClient) {
    return _anthropicClient;
  }

  const apiKey = requireEnv(env.ANTHROPIC_API_KEY, 'ANTHROPIC_API_KEY');
  _anthropicClient = new Anthropic({ apiKey });
  return _anthropicClient;
}

// Zod schema matching Prisma Insight model fields EXACTLY
const insightSchema = z.object({
  category: z.enum(['grammar', 'vocabulary', 'structure']),
  pattern: z.string(),
  detail: z.string(),
  frequency: z.number().optional(),
  severity: z.enum(['high', 'medium', 'low']).optional(),
  examples: z.array(z.string()).optional(),
  suggestion: z.string().optional(),
});

const analysisResultSchema = z.object({
  insights: z.array(insightSchema).max(5),
  focusNext: z.string(),
  summary: z.string(),
});

export type AnalysisResult = z.infer<typeof analysisResultSchema>;
export type Insight = z.infer<typeof insightSchema>;

const ANALYSIS_PROMPT = `You are an English language pattern analyzer for B2-C1+ English learners practicing speaking.

Your task: Analyze this transcript and identify the TOP 3-5 RECURRING patterns (not isolated mistakes). Focus on habits that appear multiple times across the session.

Pattern categories:
- grammar: repeated misuse of tenses, articles, prepositions, subject-verb agreement
- vocabulary: overused filler words, limited connector variety, repetitive word choice
- structure: repetitive sentence starters, complexity avoidance, monotonous rhythm

For each pattern found, provide:
- category: 'grammar' | 'vocabulary' | 'structure'
- pattern: Clear name (e.g., "Missing articles before nouns", "Overuse of 'so' as connector")
- detail: Brief explanation (1-2 sentences)
- frequency: Approximate count of occurrences in transcript
- severity: 'high' | 'medium' | 'low' (based on impact on clarity and naturalness)
- examples: Array of 2-3 exact quotes from transcript showing the pattern
- suggestion: ONE specific, actionable improvement tip

Also provide:
- focusNext: ONE concrete focus area for the next speaking session (specific and measurable, e.g., "Practice using 'however' and 'in contrast' instead of 'but' and 'so'")
- summary: 2-3 sentence overall assessment of speaking proficiency and main strengths/weaknesses

CRITICAL: Respond with ONLY valid JSON. No markdown, no explanations. Just the JSON object.

Schema:
{
  "insights": [
    {
      "category": "grammar" | "vocabulary" | "structure",
      "pattern": "string",
      "detail": "string",
      "frequency": number,
      "severity": "high" | "medium" | "low",
      "examples": ["string", "string"],
      "suggestion": "string"
    }
  ],
  "focusNext": "string",
  "summary": "string"
}`;

// Analyze transcript using Claude Haiku — returns structured insights validated against Prisma schema
export async function analyzeTranscript(
  transcript: string
): Promise<AnalysisResult> {
  const client = getAnthropicClient();

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `${ANALYSIS_PROMPT}\n\nTranscript:\n${transcript}`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  // Parse and validate response with Zod — throws ZodError on schema mismatch
  const parsed: unknown = JSON.parse(content.text);
  return analysisResultSchema.parse(parsed);
}
```

---

### File 4: `src/app/api/internal/process/route.ts`

```typescript
// Webhook handler for async session processing (QStash → Whisper → Claude → DB)
import { NextRequest, NextResponse } from 'next/server';
import { Receiver } from '@upstash/qstash';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import { Prisma, SessionStatus } from '@prisma/client';
import { transcribeAudio } from '@/lib/ai/whisper';
import { analyzeTranscript } from '@/lib/ai/analyze';
import { updatePatternProfile } from '@/features/session/updatePatternProfile';
import { getAudio, deleteAudio } from '@/lib/storage/r2';

// Runtime validation — QStash signing keys are optional in env.ts but required here
function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Lazy singleton — consistent with r2.ts, qstash.ts, whisper.ts, analyze.ts
let _receiver: Receiver | null = null;

function getReceiver(): Receiver {
  if (_receiver) {
    return _receiver;
  }
  const currentSigningKey = requireEnv(env.QSTASH_CURRENT_SIGNING_KEY, 'QSTASH_CURRENT_SIGNING_KEY');
  const nextSigningKey = requireEnv(env.QSTASH_NEXT_SIGNING_KEY, 'QSTASH_NEXT_SIGNING_KEY');
  _receiver = new Receiver({ currentSigningKey, nextSigningKey });
  return _receiver;
}

export async function POST(request: NextRequest) {
  // sessionId declared outside try so catch block can mark session as FAILED
  let sessionId: string | null = null;

  try {
    // Step 1: Verify QStash signature — body must be read once as text
    const signature = request.headers.get('upstash-signature');
    const body = await request.text();

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const isValid = await getReceiver().verify({ signature, body });
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid signature', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Step 2: Parse body — store sessionId as const for closure safety
    const parsed = JSON.parse(body) as { sessionId: string };
    sessionId = parsed.sessionId;
    const id = sessionId;

    // Step 3: Fetch session
    const session = await prisma.speakingSession.findUnique({
      where: { id },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Step 4: Guard — must be UPLOADED to proceed
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

    // Step 6: Mark TRANSCRIBING
    await prisma.speakingSession.update({
      where: { id },
      data: { status: SessionStatus.TRANSCRIBING },
    });

    // Step 7: Transcribe audio with Whisper
    const transcriptText = await transcribeAudio(audioBuffer, `session-${id}.webm`);

    // Step 8: Store transcript with word count
    const wordCount = transcriptText.trim().split(/\s+/).length;
    await prisma.transcript.create({
      data: { sessionId: id, text: transcriptText, wordCount },
    });

    // Step 9: Delete audio from R2 immediately after transcription (privacy + cost)
    await deleteAudio(session.audioUrl);
    await prisma.speakingSession.update({
      where: { id },
      data: { audioDeletedAt: new Date() },
    });

    // Step 10: Mark ANALYZING
    await prisma.speakingSession.update({
      where: { id },
      data: { status: SessionStatus.ANALYZING },
    });

    // Step 11: Analyze transcript with Claude
    const analysis = await analyzeTranscript(transcriptText);

    // Step 12: Store insights (up to 5 per session)
    await prisma.insight.createMany({
      data: analysis.insights.map((insight) => ({
        sessionId: id,
        category: insight.category,
        pattern: insight.pattern,
        detail: insight.detail,
        frequency: insight.frequency ?? null,
        severity: insight.severity ?? null,
        examples: insight.examples ?? Prisma.JsonNull,
        suggestion: insight.suggestion ?? null,
      })),
    });

    // Step 13: Store focusNext on the session
    await prisma.speakingSession.update({
      where: { id },
      data: { focusNext: analysis.focusNext },
    });

    // Step 14: Aggregate insights into user's long-term pattern profile
    await updatePatternProfile(session.userId, analysis.insights);

    // Step 15: Mark DONE
    await prisma.speakingSession.update({
      where: { id },
      data: { status: SessionStatus.DONE },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    // Mark session as FAILED with error detail to prevent stuck states
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

### File 5: `src/features/session/updatePatternProfile.ts`

```typescript
// Utility for aggregating pattern insights into user pattern profiles
import { prisma } from '@/lib/prisma';

interface PatternInsight {
  category: string;
  pattern: string;
  frequency?: number;
}

// Create or update user's pattern profile with new session insights
export async function updatePatternProfile(
  userId: string,
  insights: PatternInsight[]
): Promise<void> {
  const existing = await prisma.patternProfile.findUnique({
    where: { userId },
  });

  // Cast from Prisma JsonValue — patterns are stored as { "category:pattern": count }
  const patterns = (existing?.patterns as unknown as Record<string, number>) ?? {};

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

### File 6 (MODIFY): `src/app/api/sessions/route.ts`

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

## VALIDATION

After implementing all files, validate the build:

```bash
npx tsc --noEmit
npm run build
```

Both commands must complete with zero errors.

---

## KEY IMPLEMENTATION NOTES

1. **Lazy singleton pattern**: All clients (QStash, OpenAI, Anthropic, Receiver) use runtime validation + lazy initialization. This prevents build-time crashes when env vars are missing.

2. **Parse body ONCE**: The request body in the webhook handler is parsed once at the top and `sessionId` is stored in a variable accessible to both the `try` and `catch` blocks. This prevents the error where we try to re-read the body stream (which can only be read once).

3. **SessionStatus enum**: Imported from `@prisma/client`. Use `SessionStatus.UPLOADED`, `SessionStatus.TRANSCRIBING`, etc.

4. **Error handling**: On any error, mark session as `FAILED` with `errorMessage`. This prevents sessions from getting stuck in intermediate states. QStash will retry up to 3 times.

5. **Audio deletion**: Audio is deleted from R2 immediately after transcription (privacy + cost). `audioDeletedAt` is set in the DB.

6. **Field names match Prisma EXACTLY**: `audioUrl`, `audioDeletedAt`, `focusNext`, `wordCount`, `errorMessage`.

7. **Zod validation**: Claude's JSON response is parsed and validated with Zod. Max 5 insights enforced at schema level.

8. **Pattern-focused prompt**: Instructs Claude to find RECURRING patterns (not correct every sentence). Appropriate for B2-C1+ learners.

9. **Model selection**: `claude-haiku-4-5-20251001` — cheapest tier, sufficient for pattern detection in MVP.

10. **QStash endpoint**: Points to `/api/internal/process` with 3 retries for transient failures.

---

## DO NOT

- Parse request body twice (it's a stream, can only be read once)
- Use wrong field names (e.g., `audio_url` instead of `audioUrl`)
- Import SessionStatus as a string union (it's an enum from @prisma/client)
- Skip signature verification (security requirement)
- Modify `env.ts` (all required vars are already present as optional)
- Modify `r2.ts` (`getAudio()` and `deleteAudio()` already exist)
- Use direct client instantiation (must use lazy singleton pattern)

---

## DOCUMENTATION

After successful validation, create these documentation files:

### Journal Entries

#### `docs/journal/ENTRY-07a.md`

```markdown
# ENTRY-07a — QStash + Whisper Integration

**Date**: 2026-02-18
**Type**: Feature
**Branch**: feature/processing-pipeline
**Version**: 0.7.0

## Summary

Integrated QStash for async job queuing and OpenAI Whisper for audio transcription.

## Files Created

- `src/lib/queue/qstash.ts` — QStash client with `enqueueProcessing()` function
- `src/lib/ai/whisper.ts` — Whisper STT client with `transcribeAudio()` function

## Key Decisions

1. **Lazy singleton pattern**: Both clients use runtime validation + lazy initialization (consistent with existing `r2.ts` pattern).
2. **QStash endpoint**: Publishes to `${APP_URL}/api/internal/process` with 3 retries.
3. **Whisper model**: Using `whisper-1` with English language hint for better accuracy.
4. **File type**: Audio files expected as `audio/webm` (matches frontend recording format).

## Dependencies Added

- `@upstash/qstash` — QStash client for async job queuing
- `openai` — Official OpenAI SDK (includes Whisper API)

## Next Steps

- Build Claude analysis client with Zod schema
- Build webhook handler + wire QStash trigger in sessions API
```

#### `docs/journal/ENTRY-07b.md`

```markdown
# ENTRY-07b — Claude Analysis Integration

**Date**: 2026-02-18
**Type**: Feature
**Branch**: feature/processing-pipeline
**Version**: 0.7.0

## Summary

Integrated Claude Haiku for transcript analysis with Zod-validated schema matching Prisma models.

## Files Created

- `src/lib/ai/analyze.ts` — Claude client + analysis prompt + Zod schema

## Key Decisions

1. **Model selection**: Using `claude-haiku-4-5-20251001` for cost efficiency in MVP.
2. **Pattern-focused analysis**: Prompt finds RECURRING patterns, not sentence-by-sentence corrections.
3. **Zod schema matches Prisma EXACTLY**: Every field maps directly to the `Insight` model.
4. **Max 5 insights**: Prevents cognitive overload.
5. **focusNext field**: ONE concrete goal for next session.

## Dependencies Added

- `@anthropic-ai/sdk` — Official Anthropic SDK for Claude API

## Next Steps

- Build webhook handler + wire QStash trigger + pattern profile updater
```

#### `docs/journal/ENTRY-07c.md`

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

1. **15-step pipeline**: Signature verification → session validation → audio download → transcription → transcript storage → audio deletion → analysis → insights storage → focusNext → pattern profile → DONE.
2. **Parse body once**: Prevents stream re-read errors.
3. **Audio deletion**: Privacy-first — deleted immediately after transcription.
4. **Pattern profile**: Uses `upsert` with JSON keys like `"grammar:Missing articles"`.
5. **Error resilience**: Any failure marks session as FAILED with errorMessage.

## State Machine

CREATED → UPLOADED → TRANSCRIBING → ANALYZING → DONE
                ↓          ↓           ↓
              FAILED     FAILED      FAILED

## Next Steps

- PACKET-08: Build results UI to display insights and focusNext
```

---

### Build Reports

#### `docs/build-packet-reports/PACKET-07a-qstash-whisper-report.md`

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

✅ npx tsc --noEmit (0 errors)
✅ npm run build (success)

## Testing Notes

- QStash client uses lazy singleton pattern (consistent with r2.ts)
- Whisper client converts Buffer to File object for API
- Runtime validation prevents build-time crashes when env vars missing
```

#### `docs/build-packet-reports/PACKET-07b-claude-analysis-report.md`

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

## Validation

✅ npx tsc --noEmit (0 errors)
✅ npm run build (success)

## Testing Notes

- Prompt instructs Claude to return JSON-only (no markdown)
- Schema validates category, pattern, detail, frequency, severity, examples, suggestion
- focusNext provides ONE concrete goal for next session
```

#### `docs/build-packet-reports/PACKET-07c-pipeline-orchestration-report.md`

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

## Validation

✅ npx tsc --noEmit (0 errors)
✅ npm run build (success)

## Testing Notes

- Body parsed once (prevents stream re-read errors)
- SessionStatus enum imported from @prisma/client
- All field names match Prisma schema exactly
- Error handling marks session as FAILED (prevents stuck states)
```

---

### PR Documentation: `docs/pull-requests/PR-0.7.0.md`

```markdown
# PR-0.7.0 — Async Processing Pipeline

**Branch**: `feature/processing-pipeline`
**Base**: `main`
**Date**: 2026-02-18

## Summary

Implemented async processing pipeline for speaking sessions using QStash, Whisper, and Claude. Sessions progress through state machine: UPLOADED → TRANSCRIBING → ANALYZING → DONE (or FAILED on error).

## What Was Built

- QStash client for async job queuing
- Whisper STT client for audio transcription
- Claude Haiku client for pattern analysis (Zod-validated)
- 15-step webhook handler at `/api/internal/process`
- Pattern profile aggregator
- QStash trigger wired into sessions API

## Key Features

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

## Environment Variables Required

QSTASH_TOKEN, QSTASH_CURRENT_SIGNING_KEY, QSTASH_NEXT_SIGNING_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, APP_URL

## Validation

✅ npx tsc --noEmit (0 errors)
✅ npm run build (success)
✅ npm run lint (0 violations)
```

---

### Roadmap Update: `docs/roadmap/ROADMAP.md`

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

## References

See `.cursorrules` for TypeScript standards, component patterns, and project structure.
