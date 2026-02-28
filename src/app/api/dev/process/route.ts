// Dev-only sync pipeline — runs Whisper + Claude without QStash signature verification
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import { Prisma, SessionStatus } from '@prisma/client';
import { transcribeAudio } from '@/lib/ai/whisper';
import { analyzeTranscript } from '@/lib/ai/analyze';
import { updatePatternProfile } from '@/features/session/updatePatternProfile';
import { getAudio, deleteAudio } from '@/lib/storage/r2';

export async function POST(request: NextRequest) {
  // Hard block — never accessible outside development
  if (env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Dev-only endpoint', code: 'FORBIDDEN' },
      { status: 403 }
    );
  }

  let sessionId: string | null = null;

  try {
    // Step 1: Parse body — no signature verification needed in dev
    const body = await request.json() as { sessionId?: string };
    sessionId = body.sessionId ?? null;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing sessionId', code: 'BAD_REQUEST' },
        { status: 400 }
      );
    }

    const id = sessionId;

    // Step 2: Fetch session
    const session = await prisma.speakingSession.findUnique({
      where: { id },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Step 3: Guard — allow re-entry from intermediate states
    const retriableStatuses: SessionStatus[] = [
      SessionStatus.UPLOADED,
      SessionStatus.TRANSCRIBING,
      SessionStatus.ANALYZING,
    ];

    if (!retriableStatuses.includes(session.status)) {
      return NextResponse.json(
        { error: `Session in wrong state: ${session.status}`, code: 'INVALID_STATE' },
        { status: 400 }
      );
    }

    if (!session.audioUrl) {
      return NextResponse.json(
        { error: 'Session missing audio URL', code: 'BAD_REQUEST' },
        { status: 400 }
      );
    }

    console.log(`[dev-pipeline] Starting for session ${id}`);

    // Step 4: Download audio from R2
    const audioBuffer = await getAudio(session.audioUrl);
    console.log(`[dev-pipeline] Audio downloaded (${audioBuffer.length} bytes)`);

    // Step 5: Mark TRANSCRIBING
    await prisma.speakingSession.update({
      where: { id },
      data: { status: SessionStatus.TRANSCRIBING },
    });

    // Step 6: Transcribe audio with Whisper
    const transcriptText = await transcribeAudio(audioBuffer, `session-${id}.webm`);
    console.log(`[dev-pipeline] Transcribed (${transcriptText.length} chars)`);

    // Step 7: Store transcript with word count
    const wordCount = transcriptText.trim().split(/\s+/).length;

    // Upsert in case of re-run on same session
    await prisma.transcript.upsert({
      where: { sessionId: id },
      create: { sessionId: id, text: transcriptText, wordCount },
      update: { text: transcriptText, wordCount },
    });

    // Step 8: Delete audio from R2 (privacy + cost)
    await deleteAudio(session.audioUrl);
    await prisma.speakingSession.update({
      where: { id },
      data: { audioDeletedAt: new Date() },
    });
    console.log(`[dev-pipeline] Audio deleted from R2`);

    // Step 9: Mark ANALYZING
    await prisma.speakingSession.update({
      where: { id },
      data: { status: SessionStatus.ANALYZING },
    });

    // Step 10: Analyze transcript with Claude
    const analysis = await analyzeTranscript(transcriptText);
    console.log(`[dev-pipeline] Analysis complete (${analysis.insights.length} insights)`);

    // Step 11: Delete existing insights for re-run safety, then create new ones
    await prisma.insight.deleteMany({ where: { sessionId: id } });
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

    // Step 12: Store focusNext, summary, and intentLabel
    await prisma.speakingSession.update({
      where: { id },
      data: {
        focusNext: analysis.focusNext,
        summary: analysis.summary,
        intentLabel: analysis.intentLabel,
      },
    });

    // Step 13: Update pattern profile
    await updatePatternProfile(session.userId, analysis.insights);

    // Step 14: Mark DONE
    await prisma.speakingSession.update({
      where: { id },
      data: { status: SessionStatus.DONE },
    });

    console.log(`[dev-pipeline] ✅ Session ${id} → DONE`);

    return NextResponse.json({
      ok: true,
      sessionId: id,
      insightCount: analysis.insights.length,
      wordCount,
      summary: analysis.summary,
    });
  } catch (error) {
    console.error('[dev-pipeline] Error:', error);

    // Mark FAILED in dev (no retry logic needed)
    if (sessionId) {
      try {
        await prisma.speakingSession.update({
          where: { id: sessionId },
          data: {
            status: SessionStatus.FAILED,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      } catch (dbError) {
        console.error('[dev-pipeline] Failed to update session status:', dbError);
      }
    }

    return NextResponse.json(
      {
        error: 'Dev pipeline failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
