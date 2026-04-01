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
import { log } from '@/lib/logger';
import { z } from 'zod';

const processBodySchema = z.object({ sessionId: z.string() });

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
  const startTime = Date.now();

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
    const parseResult = processBodySchema.safeParse(JSON.parse(body));
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Missing sessionId', code: 'BAD_REQUEST' },
        { status: 400 }
      );
    }
    sessionId = parseResult.data.sessionId;
    const id = sessionId;

    // Step 3: Fetch session
    const session = await prisma.speakingSession.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        status: true,
        audioUrl: true,
        focusMetricKey: true,
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Step 4: Guard — allow re-entry for QStash retries from intermediate states
    const retriableStatuses: SessionStatus[] = [
      SessionStatus.UPLOADED,
      SessionStatus.TRANSCRIBING,
      SessionStatus.ANALYZING,
    ];

    if (!retriableStatuses.includes(session.status)) {
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

    log({
      level: 'info',
      message: 'Starting transcription',
      sessionId: id,
      userId: session.userId,
    });

    // Step 7: Transcribe audio with Whisper
    const transcriptText = await transcribeAudio(audioBuffer, `session-${id}.webm`);

    // Step 8: Store transcript with word count
    const wordCount = transcriptText.trim().split(/\s+/).length;
    await prisma.transcript.create({
      data: { sessionId: id, text: transcriptText, wordCount },
    });

    log({
      level: 'info',
      message: 'Transcription complete',
      sessionId: id,
      userId: session.userId,
      metadata: { wordCount },
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
    const analysis = await analyzeTranscript(transcriptText, session.focusMetricKey);

    log({
      level: 'info',
      message: 'Analysis complete',
      sessionId: id,
      userId: session.userId,
      metadata: { insightCount: analysis.insights.length },
    });

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

    // Step 12b: Store metric snapshots from analysis result
    if (analysis.metrics.length > 0) {
      await prisma.metricSnapshot.createMany({
        data: analysis.metrics.map((metric) => ({
          sessionId: id,
          key: metric.key,
          level: metric.level,
          score: metric.score,
          note: metric.note,
        })),
        skipDuplicates: true,
      });
    }

    // Step 13: Store focusNext, summary, and intentLabel on the session
    await prisma.speakingSession.update({
      where: { id },
      data: {
        focusNext: analysis.focusNext,
        summary: analysis.summary,
        intentLabel: analysis.intentLabel,
      },
    });

    // Step 14: Aggregate insights into user's long-term pattern profile
    await updatePatternProfile(session.userId, analysis.insights);

    // Step 15: Mark DONE
    await prisma.speakingSession.update({
      where: { id },
      data: { status: SessionStatus.DONE },
    });

    const processingDuration = Date.now() - startTime;
    log({
      level: 'info',
      message: 'Processing complete',
      sessionId: id,
      userId: session.userId,
      duration: processingDuration,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    log({
      level: 'error',
      message: 'Processing failed',
      sessionId: sessionId ?? undefined,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Determine if QStash will retry — only mark FAILED on final attempt
    const retriedHeader = request.headers.get('upstash-retried');
    const maxRetriesHeader = request.headers.get('upstash-max-retries');
    const retried = retriedHeader !== null ? parseInt(retriedHeader, 10) : null;
    const maxRetries = maxRetriesHeader !== null ? parseInt(maxRetriesHeader, 10) : null;

    const isFinalAttempt =
      retried === null ||
      maxRetries === null ||
      retried >= maxRetries - 1;

    // Only mark session as FAILED on the final retry attempt
    if (sessionId && isFinalAttempt) {
      try {
        await prisma.speakingSession.update({
          where: { id: sessionId },
          data: {
            status: SessionStatus.FAILED,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      } catch (dbError) {
        log({
          level: 'error',
          message: 'Failed to update session status to FAILED',
          sessionId: sessionId ?? undefined,
          error: dbError instanceof Error ? dbError.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json(
      { error: 'Processing failed', code: 'PROCESSING_ERROR' },
      { status: 500 }
    );
  }
}
