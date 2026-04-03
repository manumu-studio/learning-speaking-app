// Executes the full speaking session processing pipeline — transcription, analysis, metrics, patterns
import { Prisma, SessionStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { transcribeAudio } from '@/lib/ai/whisper';
import { analyzeTranscript } from '@/lib/ai/analyze';
import { updatePatternProfile } from '@/features/session/updatePatternProfile';
import { getAudio, deleteAudio } from '@/lib/storage/r2';
import { log } from '@/lib/logger';

type PipelineMode = 'production' | 'dev';

export async function executePipeline(
  sessionId: string,
  mode: PipelineMode
): Promise<void> {
  const startTime = Date.now();

  // Step 1: Fetch session
  const session = await prisma.speakingSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      userId: true,
      status: true,
      audioUrl: true,
      focusMetricKey: true,
    },
  });

  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  // Step 2: Status guard — production only allows retriable states, dev allows re-runs
  const retriableStatuses: SessionStatus[] = [
    SessionStatus.UPLOADED,
    SessionStatus.TRANSCRIBING,
    SessionStatus.ANALYZING,
  ];

  if (!retriableStatuses.includes(session.status)) {
    if (mode === 'production') {
      throw new Error(`Session in invalid state: ${session.status}`);
    }
    // Dev mode: allow re-runs from any state (e.g. DONE, FAILED)
  }

  if (!session.audioUrl) {
    throw new Error('Session missing audio URL');
  }

  const id = session.id;

  log({
    level: 'info',
    message: `${mode} pipeline starting`,
    sessionId: id,
    userId: session.userId,
  });

  // Step 3: Download audio from R2
  const audioBuffer = await getAudio(session.audioUrl);

  // Step 4: Mark TRANSCRIBING
  await prisma.speakingSession.update({
    where: { id },
    data: { status: SessionStatus.TRANSCRIBING },
  });

  // Step 5: Transcribe audio with Whisper
  const transcriptText = await transcribeAudio(audioBuffer, `session-${id}.webm`);
  const wordCount = transcriptText.trim().split(/\s+/).length;

  log({
    level: 'info',
    message: 'Transcription complete',
    sessionId: id,
    userId: session.userId,
    metadata: { wordCount },
  });

  // Step 6: Store transcript — production creates, dev upserts for re-run safety
  if (mode === 'dev') {
    await prisma.transcript.upsert({
      where: { sessionId: id },
      create: { sessionId: id, text: transcriptText, wordCount },
      update: { text: transcriptText, wordCount },
    });
  } else {
    await prisma.transcript.create({
      data: { sessionId: id, text: transcriptText, wordCount },
    });
  }

  // Step 7: Delete audio from R2 (privacy + cost)
  try {
    await deleteAudio(session.audioUrl);
    await prisma.speakingSession.update({
      where: { id },
      data: { audioDeletedAt: new Date() },
    });
  } catch (deleteError) {
    log({
      level: 'warn',
      message: 'Failed to delete audio from R2 (non-blocking)',
      sessionId: id,
      error: deleteError instanceof Error ? deleteError.message : 'Unknown error',
    });
  }

  // Step 8: Mark ANALYZING
  await prisma.speakingSession.update({
    where: { id },
    data: { status: SessionStatus.ANALYZING },
  });

  // Step 9: Analyze transcript with Claude
  const analysis = await analyzeTranscript(transcriptText, session.focusMetricKey);

  log({
    level: 'info',
    message: 'Analysis complete',
    sessionId: id,
    userId: session.userId,
    metadata: { insightCount: analysis.insights.length },
  });

  // Step 10: Store insights — dev deletes existing first for re-run safety
  if (mode === 'dev') {
    await prisma.insight.deleteMany({ where: { sessionId: id } });
  }

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

  // Step 11: Store metric snapshots — dev deletes existing first
  if (analysis.metrics.length > 0) {
    if (mode === 'dev') {
      await prisma.metricSnapshot.deleteMany({ where: { sessionId: id } });
    }

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

  // Step 12: Store focusNext, summary, and intentLabel on the session
  await prisma.speakingSession.update({
    where: { id },
    data: {
      focusNext: analysis.focusNext,
      summary: analysis.summary,
      intentLabel: analysis.intentLabel,
    },
  });

  // Step 13: Aggregate insights into user's long-term pattern profile
  await updatePatternProfile(session.userId, analysis.insights);

  // Step 14: Mark DONE
  await prisma.speakingSession.update({
    where: { id },
    data: { status: SessionStatus.DONE },
  });

  const processingDuration = Date.now() - startTime;
  log({
    level: 'info',
    message: `${mode} pipeline complete`,
    sessionId: id,
    userId: session.userId,
    duration: processingDuration,
  });
}
