# PACKET-07 — Async Processing Pipeline

**Branch**: `feature/processing-pipeline`
**Version**: `0.7.0`

## Prerequisites

- Prisma schema deployed with `SpeakingSession`, `Transcript`, `Insight`, `PatternProfile` models
- R2 credentials in `.env`
- `POST /api/sessions` creates sessions with `UPLOADED` status and stores audio in R2
- Next.js 15 app with TypeScript strict mode

## What to Build

### 1. Install dependencies

```bash
npm install @upstash/qstash openai @anthropic-ai/sdk
```

### 2. Add environment variables

Update `src/lib/env.ts` to include:

```typescript
QSTASH_TOKEN: z.string().min(1),
QSTASH_CURRENT_SIGNING_KEY: z.string().min(1),
QSTASH_NEXT_SIGNING_KEY: z.string().min(1),
OPENAI_API_KEY: z.string().min(1),
ANTHROPIC_API_KEY: z.string().min(1),
APP_URL: z.string().url(),
```

### 3. Create QStash client

Create `src/lib/queue/qstash.ts`:

```typescript
// QStash client for enqueuing async processing jobs
import { Client } from '@upstash/qstash';
import { env } from '@/lib/env';

export const qstashClient = new Client({ token: env.QSTASH_TOKEN });

export async function enqueueProcessing(sessionId: string): Promise<void> {
  await qstashClient.publishJSON({
    url: `${env.APP_URL}/api/internal/process`,
    body: { sessionId },
    retries: 3,
  });
}
```

### 4. Create Whisper STT client

Create `src/lib/ai/whisper.ts`:

```typescript
// OpenAI Whisper client for speech-to-text transcription
import OpenAI from 'openai';
import { env } from '@/lib/env';

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string
): Promise<string> {
  const file = new File([audioBuffer], filename, { type: 'audio/webm' });
  const response = await openai.audio.transcriptions.create({
    model: 'whisper-1',
    file,
    language: 'en',
  });
  return response.text;
}
```

### 5. Create Claude analysis client

Create `src/lib/ai/analyze.ts`:

```typescript
// Claude Haiku client for analyzing transcripts and detecting patterns
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { env } from '@/lib/env';

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

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

const ANALYSIS_PROMPT = `You are an English language pattern analyzer. You help B2-C1+ English learners identify recurring habits in their spoken English.

Analyze this transcript from a speaking practice session. Do NOT correct every sentence. Instead, identify the TOP 3-5 recurring PATTERNS across the entire transcript.

Focus on:
- Grammar patterns: repeated misuse of tenses, articles, prepositions
- Vocabulary patterns: overused simple words, limited connector variety
- Structure patterns: repetitive sentence starters, complexity avoidance

For each pattern found:
- Name the pattern clearly
- Explain it briefly
- Count approximate frequency
- Rate severity (high/medium/low)
- Give 2-3 examples from the transcript
- Suggest one specific improvement

Also provide:
- focusNext: ONE actionable focus for the next session (specific, measurable)
- summary: 2-3 sentence overall assessment

Respond ONLY with valid JSON matching this schema:
{ "insights": [...], "focusNext": "...", "summary": "..." }`;

export async function analyzeTranscript(
  transcript: string
): Promise<AnalysisResult> {
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
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

  const parsed = JSON.parse(content.text);
  return analysisResultSchema.parse(parsed);
}
```

### 6. Create processing webhook handler

Create `src/app/api/internal/process/route.ts`:

```typescript
// Webhook handler for async session processing (QStash → Whisper → Claude → DB)
import { NextRequest, NextResponse } from 'next/server';
import { Receiver } from '@upstash/qstash';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';
import { transcribeAudio } from '@/lib/ai/whisper';
import { analyzeTranscript } from '@/lib/ai/analyze';
import { updatePatternProfile } from '@/features/session/updatePatternProfile';
import { downloadFromR2, deleteFromR2 } from '@/lib/storage/r2';

const receiver = new Receiver({
  currentSigningKey: env.QSTASH_CURRENT_SIGNING_KEY,
  nextSigningKey: env.QSTASH_NEXT_SIGNING_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // Verify QStash signature
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

    const { sessionId } = JSON.parse(body) as { sessionId: string };

    // Fetch session
    const session = await prisma.speakingSession.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (session.status !== 'UPLOADED') {
      return NextResponse.json(
        { error: 'Session already processed', code: 'INVALID_STATE' },
        { status: 400 }
      );
    }

    if (!session.audioUrl) {
      throw new Error('No audio URL for session');
    }

    // Step 1: Download audio from R2
    const audioBuffer = await downloadFromR2(session.audioUrl);

    // Step 2: Update status to TRANSCRIBING
    await prisma.speakingSession.update({
      where: { id: sessionId },
      data: { status: 'TRANSCRIBING' },
    });

    // Step 3: Transcribe audio
    const transcriptText = await transcribeAudio(
      audioBuffer,
      `session-${sessionId}.webm`
    );

    // Step 4: Store transcript and delete audio
    const wordCount = transcriptText.split(/\s+/).length;
    await prisma.transcript.create({
      data: {
        sessionId,
        text: transcriptText,
        wordCount,
      },
    });

    await deleteFromR2(session.audioUrl);
    await prisma.speakingSession.update({
      where: { id: sessionId },
      data: { audioDeletedAt: new Date() },
    });

    // Step 5: Update status to ANALYZING
    await prisma.speakingSession.update({
      where: { id: sessionId },
      data: { status: 'ANALYZING' },
    });

    // Step 6: Analyze transcript
    const analysis = await analyzeTranscript(transcriptText);

    // Step 7: Store insights and focusNext
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

    await prisma.speakingSession.update({
      where: { id: sessionId },
      data: { focusNext: analysis.focusNext },
    });

    // Step 8: Update pattern profile
    await updatePatternProfile(session.userId, analysis.insights);

    // Step 9: Mark as DONE
    await prisma.speakingSession.update({
      where: { id: sessionId },
      data: { status: 'DONE' },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const { sessionId } = JSON.parse(await request.text()) as {
      sessionId: string;
    };

    // Mark as FAILED
    await prisma.speakingSession.update({
      where: { id: sessionId },
      data: {
        status: 'FAILED',
        errorMessage:
          error instanceof Error ? error.message : 'Unknown error',
      },
    });

    return NextResponse.json(
      {
        error: 'Processing failed',
        code: 'PROCESSING_ERROR',
      },
      { status: 500 }
    );
  }
}
```

### 7. Create R2 utility functions

Create `src/lib/storage/r2.ts`:

```typescript
// Cloudflare R2 utilities for audio storage
import {
  S3Client,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { env } from '@/lib/env';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

export async function downloadFromR2(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
  });

  const response = await r2Client.send(command);
  if (!response.Body) {
    throw new Error('Empty response from R2');
  }

  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

export async function deleteFromR2(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
  });

  await r2Client.send(command);
}
```

### 8. Create pattern profile updater

Create `src/features/session/updatePatternProfile.ts`:

```typescript
// Utility for updating user pattern profiles with new insights
import { prisma } from '@/lib/db';

interface Insight {
  category: string;
  pattern: string;
  frequency?: number;
}

export async function updatePatternProfile(
  userId: string,
  insights: Insight[]
): Promise<void> {
  const existing = await prisma.patternProfile.findUnique({
    where: { userId },
  });

  const patterns = existing?.patterns as Record<string, number> | null;
  const updated = patterns ?? {};

  // Increment pattern counters
  for (const insight of insights) {
    const key = `${insight.category}:${insight.pattern}`;
    updated[key] = (updated[key] ?? 0) + (insight.frequency ?? 1);
  }

  await prisma.patternProfile.upsert({
    where: { userId },
    create: {
      userId,
      patterns: updated,
      lastUpdated: new Date(),
    },
    update: {
      patterns: updated,
      lastUpdated: new Date(),
    },
  });
}
```

### 9. Update session creation to enqueue job

Modify `src/app/api/sessions/route.ts` POST handler:

After creating the session and uploading audio, add:

```typescript
// Enqueue processing job
await enqueueProcessing(session.id);
```

Import the function:

```typescript
import { enqueueProcessing } from '@/lib/queue/qstash';
```

## Files to Create/Modify

| File | Purpose |
|------|---------|
| `src/lib/queue/qstash.ts` | QStash client + enqueue function |
| `src/lib/ai/whisper.ts` | Whisper STT client |
| `src/lib/ai/analyze.ts` | Claude Haiku analysis + prompt + schema |
| `src/lib/storage/r2.ts` | R2 download/delete utilities |
| `src/app/api/internal/process/route.ts` | Processing webhook handler |
| `src/features/session/updatePatternProfile.ts` | Pattern aggregation utility |
| `src/app/api/sessions/route.ts` | Updated POST to enqueue job |

## Definition of Done

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` succeeds
- [ ] QStash signature verification works
- [ ] Whisper API called with correct params
- [ ] Claude Haiku returns valid JSON (Zod-validated)
- [ ] Session progresses: UPLOADED → TRANSCRIBING → ANALYZING → DONE
- [ ] Audio deleted from R2 after transcription
- [ ] Insights stored in DB
- [ ] PatternProfile updated
- [ ] Errors set status to FAILED with message
- [ ] All files have header comments
- [ ] No console.log statements (use structured logging)
