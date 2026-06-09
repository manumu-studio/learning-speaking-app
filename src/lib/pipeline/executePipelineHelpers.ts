// Helper functions for executePipeline — transcript storage, insight/metric persistence, session finalisation
import { Prisma, SessionStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { Insight, AnalysisResult } from '@/lib/ai/analyze';
import { isSourceOwned } from '@/lib/pipeline/sourceOwnedMetrics';

type MetricScore = AnalysisResult['metrics'][number];

/** Stores the transcript for a session, using upsert in dev mode and create in production. */
export async function storeTranscript(
  sessionId: string,
  text: string,
  wordCount: number,
  mode: 'production' | 'dev',
): Promise<void> {
  if (mode === 'dev') {
    await prisma.transcript.upsert({
      where: { sessionId },
      create: { sessionId, text, wordCount },
      update: { text, wordCount },
    });
  } else {
    await prisma.transcript.create({
      data: { sessionId, text, wordCount },
    });
  }
}

/** Persists insights for a session. In dev mode, deletes existing rows first. */
export async function storeInsights(
  sessionId: string,
  insights: Insight[],
  mode: 'production' | 'dev',
): Promise<void> {
  if (mode === 'dev') {
    await prisma.insight.deleteMany({ where: { sessionId } });
  }

  await prisma.insight.createMany({
    data: insights.map((insight) => ({
      sessionId,
      category: insight.category,
      pattern: insight.pattern,
      detail: insight.detail,
      frequency: insight.frequency ?? null,
      severity: insight.severity ?? null,
      examples: insight.examples ?? Prisma.JsonNull,
      suggestion: insight.suggestion ?? null,
    })),
  });
}

/** Persists metric snapshots for a session. Filters out source-owned metrics (speakingRate, fillerUsage). */
export async function storeMetrics(
  sessionId: string,
  metrics: MetricScore[],
  mode: 'production' | 'dev',
): Promise<void> {
  if (metrics.length === 0) return;

  const metricsToWrite = metrics.filter((m) => !isSourceOwned(m.key));
  const keysToWrite = metricsToWrite.map((m) => m.key);

  if (keysToWrite.length === 0) return;

  if (mode === 'dev') {
    await prisma.metricSnapshot.deleteMany({ where: { sessionId, key: { in: keysToWrite } } });
  }

  await prisma.metricSnapshot.createMany({
    data: metricsToWrite.map((metric) => ({
      sessionId,
      key: metric.key,
      level: metric.level,
      score: metric.score,
      note: metric.note,
    })),
    skipDuplicates: true,
  });
}

interface SessionFinalData {
  sessionId: string;
  focusNext: string | null;
  summary: string | null;
  intentLabel: string | null;
  registerFeedback: unknown;
}

/**
 * Updates session fields written at the end of the pipeline: focusNext, summary, intentLabel, registerFeedback.
 *
 * @param data - Session ID plus the four analysis fields to persist.
 */
export async function storeSessionFinalData(data: SessionFinalData): Promise<void> {
  const { sessionId, focusNext, summary, intentLabel, registerFeedback } = data;
  await prisma.speakingSession.update({
    where: { id: sessionId },
    data: {
      focusNext,
      summary,
      intentLabel,
      registerFeedback:
        registerFeedback != null
          ? JSON.parse(JSON.stringify(registerFeedback))
          : Prisma.JsonNull,
    },
  });
}

/**
 * Deletes the session audio from R2 and records the deletion timestamp.
 * Errors are logged as warnings and never rethrown (non-blocking).
 *
 * @param sessionId - ID of the speaking session.
 * @param audioKey - R2 storage key of the audio file.
 * @param deleteAudioFn - The R2 deleteAudio function (injected for testability).
 */
export async function cleanupSessionAudio(
  sessionId: string,
  audioKey: string,
  deleteAudioFn: (key: string) => Promise<void>,
): Promise<void> {
  try {
    await deleteAudioFn(audioKey);
    await prisma.speakingSession.update({
      where: { id: sessionId },
      data: { audioDeletedAt: new Date() },
    });
  } catch (deleteError) {
    logger.warn(
      {
        sessionId,
        err: deleteError instanceof Error ? deleteError : new Error('Unknown error'),
      },
      'Failed to delete audio from R2 (non-blocking)',
    );
  }
}

/** Guard: validates that a session is in a retriable state for production mode. */
export function validateSessionState(
  status: SessionStatus,
  mode: 'production' | 'dev',
): void {
  const retriableStatuses: SessionStatus[] = [
    SessionStatus.UPLOADED,
    SessionStatus.TRANSCRIBING,
    SessionStatus.SCORING,
    SessionStatus.ANALYZING,
  ];

  if (!retriableStatuses.includes(status)) {
    if (mode === 'production') {
      throw new Error(`Session in invalid state: ${status}`);
    }
    // Dev mode: allow re-runs from any state (e.g. DONE, FAILED)
  }
}
