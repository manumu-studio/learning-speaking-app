// Persistence worker — writes Claude analysis results to DB and marks session DONE
import { Prisma, SessionStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { AnalysisResult } from '@/lib/ai/analyze';
import type { CorpusEvidence } from '@/lib/analysis/analysis.types';
import { filterTranscriptionArtefacts } from '@/lib/ai/nerFilter';
import { updatePatternProfile } from '@/lib/pipeline/updatePatternProfile';
import { persistVocabSuggestions } from '@/lib/pipeline/persistVocabSuggestions';
import { rewriteTranscript } from '@/lib/ai/rewriteTranscript';
import { detectVocabUsage } from '@/lib/pipeline/detectVocabUsage';
import { estimateCefr } from '@/lib/cefr/estimateCefr';
import { detectCalques } from '@/lib/naturalness/detectCalques';
import { mergeNaturalnessFlags } from '@/lib/naturalness/confidenceGate';
import { persistNaturalnessFlags } from '@/lib/pipeline/persistNaturalness';
import { invalidateDailySummary } from './processFinalHelpers';
import type { SessionChunk } from '@prisma/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PersistAnalysisOptions {
  sessionId: string;
  userId: string;
  userTranscriptText: string;
  analysis: AnalysisResult;
  chunks: SessionChunk[];
  createdAt: Date;
  corpusEvidence?: CorpusEvidence | null;
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

/**
 * Persists Claude analysis results (insights, metrics, vocab, transcript rewrite,
 * session fields, pattern profile, CEFR) and invalidates the daily summary cache.
 *
 * @param opts - All data needed to write analysis results to the DB.
 */
export async function persistAnalysisAndFinalize(opts: PersistAnalysisOptions): Promise<void> {
  const { sessionId, userId, userTranscriptText, analysis, chunks, createdAt, corpusEvidence } = opts;

  const nerFilterResult = filterTranscriptionArtefacts(analysis.insights, userTranscriptText);

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

  if (analysis.metrics.length > 0) {
    const claudeKeys = analysis.metrics.map((m) => m.key);
    await prisma.metricSnapshot.deleteMany({ where: { sessionId, key: { in: claudeKeys } } });
    await prisma.metricSnapshot.createMany({
      data: analysis.metrics.map((metric) => ({
        sessionId,
        key: metric.key,
        level: metric.level,
        score: metric.score,
        note: metric.note,
      })),
      skipDuplicates: true,
    });
  }

  if (analysis.vocabularySuggestions && analysis.vocabularySuggestions.length > 0) {
    await persistVocabSuggestions(userId, sessionId, analysis.vocabularySuggestions);
    const rewriteResult = await rewriteTranscript(userTranscriptText, analysis.vocabularySuggestions);
    if (rewriteResult) {
      await prisma.transcript.update({
        where: { sessionId },
        data: { improvedText: rewriteResult.improvedText, wordsUsed: rewriteResult.wordsUsed },
      });
    }
  }

  await detectVocabUsage(userId, sessionId, userTranscriptText);

  // Naturalness detection: deterministic calques + Claude-flagged items → persist
  const calqueFlags = detectCalques(userTranscriptText);
  const claudeNaturalness = analysis.naturalness ?? [];
  const mergedFlags = mergeNaturalnessFlags(calqueFlags, claudeNaturalness, corpusEvidence);
  if (mergedFlags.length > 0) {
    await persistNaturalnessFlags(userId, sessionId, mergedFlags);
  }

  const totalDurationSecs = chunks.reduce(
    (sum, chunk, index) =>
      sum + Math.max(0, chunk.durationSecs - (index === 0 ? 0 : chunk.overlapSecs)),
    0,
  );

  await prisma.speakingSession.update({
    where: { id: sessionId },
    data: {
      status: SessionStatus.DONE,
      durationSecs: Math.round(totalDurationSecs),
      focusNext: analysis.focusNext,
      summary: analysis.summary,
      intentLabel: analysis.intentLabel,
      processedAt: new Date(),
    },
  });

  await updatePatternProfile(userId, nerFilterResult.kept);
  await invalidateDailySummary(userId, createdAt);

  const cefrEstimate = estimateCefr(analysis.metrics.map((m) => ({ key: m.key, score: m.score })));
  if (cefrEstimate !== null) {
    await prisma.user.update({
      where: { id: userId },
      data: { estimatedCefrLevel: cefrEstimate.level },
    });
  }
}
