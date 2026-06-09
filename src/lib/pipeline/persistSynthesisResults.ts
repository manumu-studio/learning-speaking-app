// Persists synthesis results (insights, metrics, vocab, session fields, CEFR) after fan-in.
import { Prisma, SessionStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { filterTranscriptionArtefacts } from '@/lib/ai/nerFilter';
import type { SynthesisResult } from '@/lib/ai/synthesize';
import { updatePatternProfile } from '@/features/session/updatePatternProfile';
import { persistVocabSuggestions } from '@/lib/pipeline/persistVocabSuggestions';
import { detectVocabUsage } from '@/lib/pipeline/detectVocabUsage';
import { rewriteTranscript } from '@/lib/ai/rewriteTranscript';
import { estimateCefr } from '@/lib/cefr/estimateCefr';
import { isSourceOwned } from '@/lib/pipeline/sourceOwnedMetrics';
import { invalidateDailySummary } from './processFinalHelpers';
import type { ChunkResult } from '@prisma/client';

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface PersistSynthesisOptions {
  sessionId: string;
  userId: string;
  stitchedTranscript: string;
  synthesis: SynthesisResult;
  doneChunks: ChunkResult[];
  hasPartialResults: boolean;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Persists synthesis results (insights, metrics, vocab, session fields, CEFR)
 * and invalidates the daily summary cache.
 */
export async function persistSynthesisResults(opts: PersistSynthesisOptions): Promise<void> {
  const { sessionId, userId, stitchedTranscript, synthesis, doneChunks, hasPartialResults, createdAt } = opts;

  const nerFilterResult = filterTranscriptionArtefacts(synthesis.insights, stitchedTranscript);

  await prisma.insight.deleteMany({ where: { sessionId } });
  if (nerFilterResult.kept.length > 0) {
    await prisma.insight.createMany({
      data: nerFilterResult.kept.map((insight) => ({
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

  if (synthesis.metrics.length > 0) {
    const metricsToWrite = synthesis.metrics.filter((m) => !isSourceOwned(m.key));
    const keysToWrite = metricsToWrite.map((m) => m.key);

    if (keysToWrite.length > 0) {
      await prisma.metricSnapshot.deleteMany({ where: { sessionId, key: { in: keysToWrite } } });
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
  }

  const totalDurationSecs = doneChunks.reduce(
    (sum, chunk, index) =>
      sum + Math.max(0, chunk.durationSecs - (index === 0 ? 0 : chunk.overlapSecs)),
    0,
  );

  await prisma.speakingSession.update({
    where: { id: sessionId },
    data: {
      status: SessionStatus.DONE,
      durationSecs: Math.round(totalDurationSecs),
      focusNext: synthesis.focusNext,
      summary: synthesis.summary,
      intentLabel: synthesis.intentLabel,
      processedAt: new Date(),
      ...(hasPartialResults ? { partialResults: true } : {}),
    },
  });

  if (synthesis.vocabularySuggestions && synthesis.vocabularySuggestions.length > 0) {
    await persistVocabSuggestions(userId, sessionId, synthesis.vocabularySuggestions);
    const rewriteResult = await rewriteTranscript(stitchedTranscript, synthesis.vocabularySuggestions);
    if (rewriteResult) {
      await prisma.transcript.update({
        where: { sessionId },
        data: { improvedText: rewriteResult.improvedText, wordsUsed: rewriteResult.wordsUsed },
      });
    }
  }

  await updatePatternProfile(userId, nerFilterResult.kept);
  await detectVocabUsage(userId, sessionId, stitchedTranscript);
  await invalidateDailySummary(userId, createdAt);

  const cefrEstimate = estimateCefr(synthesis.metrics.map((m) => ({ key: m.key, score: m.score })));
  if (cefrEstimate !== null) {
    await prisma.user.update({
      where: { id: userId },
      data: { estimatedCefrLevel: cefrEstimate.level },
    });
  }
}
