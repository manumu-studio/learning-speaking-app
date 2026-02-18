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
