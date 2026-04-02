// Shared Whisper → Claude → DB pipeline for production QStash and dev sync processing
import { prisma } from '@/lib/prisma';
import { Prisma, SessionStatus } from '@prisma/client';
import { transcribeAudio } from '@/lib/ai/whisper';
import { analyzeTranscript } from '@/lib/ai/analyze';
import { updatePatternProfile } from '@/features/session/updatePatternProfile';
import { getAudio, deleteAudio } from '@/lib/storage/r2';
import { log } from '@/lib/logger';

const RETRIABLE_STATUSES: SessionStatus[] = [
  SessionStatus.UPLOADED,
  SessionStatus.TRANSCRIBING,
  SessionStatus.ANALYZING,
];

/** Maps to HTTP JSON responses when thrown from executePipeline (not processing failures). */
export class PipelineHttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string
  ) {
    super(message);
    this.name = 'PipelineHttpError';
  }
}

export async function executePipeline(
  sessionId: string,
  mode: 'production' | 'dev'
): Promise<{ insightCount: number; wordCount: number; summary: string | null }> {
  const id = sessionId;
  const startTime = Date.now();

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
    throw new PipelineHttpError('Session not found', 404, 'NOT_FOUND');
  }

  if (!RETRIABLE_STATUSES.includes(session.status)) {
    const message =
      mode === 'dev'
        ? `Session in wrong state: ${session.status}`
        : 'Session already processed or in wrong state';
    throw new PipelineHttpError(message, 400, 'INVALID_STATE');
  }

  if (!session.audioUrl) {
    if (mode === 'dev') {
      throw new PipelineHttpError('Session missing audio URL', 400, 'BAD_REQUEST');
    }
    throw new Error('Session missing audio URL');
  }

  const audioBuffer = await getAudio(session.audioUrl);

  await prisma.speakingSession.update({
    where: { id },
    data: { status: SessionStatus.TRANSCRIBING },
  });

  log({
    level: 'info',
    message: mode === 'dev' ? 'Dev pipeline: starting transcription' : 'Starting transcription',
    sessionId: id,
    userId: session.userId,
  });

  const transcriptText = await transcribeAudio(audioBuffer, `session-${id}.webm`);
  const wordCount = transcriptText.trim().split(/\s+/).length;

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

  log({
    level: 'info',
    message: 'Transcription complete',
    sessionId: id,
    userId: session.userId,
    metadata: { wordCount },
  });

  await deleteAudio(session.audioUrl);
  await prisma.speakingSession.update({
    where: { id },
    data: { audioDeletedAt: new Date() },
  });

  await prisma.speakingSession.update({
    where: { id },
    data: { status: SessionStatus.ANALYZING },
  });

  const analysis = await analyzeTranscript(transcriptText, session.focusMetricKey);

  log({
    level: 'info',
    message: 'Analysis complete',
    sessionId: id,
    userId: session.userId,
    metadata: { insightCount: analysis.insights.length },
  });

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

  if (analysis.metrics.length > 0) {
    if (mode === 'dev') {
      await prisma.metricSnapshot.deleteMany({ where: { sessionId: id } });
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
    } else {
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
  }

  await prisma.speakingSession.update({
    where: { id },
    data: {
      focusNext: analysis.focusNext,
      summary: analysis.summary,
      intentLabel: analysis.intentLabel,
    },
  });

  await updatePatternProfile(session.userId, analysis.insights);

  await prisma.speakingSession.update({
    where: { id },
    data: { status: SessionStatus.DONE },
  });

  const processingDuration = Date.now() - startTime;
  log({
    level: 'info',
    message: mode === 'dev' ? 'Dev pipeline complete' : 'Processing complete',
    sessionId: id,
    userId: session.userId,
    duration: processingDuration,
  });

  return {
    insightCount: analysis.insights.length,
    wordCount,
    summary: analysis.summary,
  };
}
