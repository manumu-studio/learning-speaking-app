// Fan-in worker — deduplicates chunk transcripts, aggregates pronunciation, runs Claude once
/* eslint-disable complexity, max-lines-per-function */
import { ChunkStatus, Prisma, SessionStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { analyzeTranscript } from '@/lib/ai/analyze';
import { filterTranscriptionArtefacts } from '@/lib/ai/nerFilter';
import { tagSpanishL1 } from '@/lib/ai/l1Spanish';
import { updatePatternProfile } from '@/features/session/updatePatternProfile';
import { aggregatePronunciation, toPronunciationResult } from '@/lib/pipeline/aggregatePronunciation';
import { concatenateChunkTranscripts } from '@/lib/pipeline/transcriptDedup';
import { persistPronunciation } from '@/lib/pipeline/persistPronunciation';
import { persistVocabSuggestions } from '@/lib/pipeline/persistVocabSuggestions';
import { detectVocabUsage } from '@/lib/pipeline/detectVocabUsage';
import { polishTranscript } from '@/lib/ai/polishTranscript';
import { rewriteTranscript } from '@/lib/ai/rewriteTranscript';
import { logger } from '@/lib/logger';
import { logPipelineStage } from '@/lib/observability';
import { estimateCefr } from '@/lib/cefr/estimateCefr';
import { buildPronunciationSummary, parseWords, parsePronWords, invalidateDailySummary } from './processFinalHelpers';

export { processParallelFinal } from './processParallelFinal';

/** Fan-in worker for chunked sessions: deduplicates transcripts, aggregates pronunciation, runs Claude analysis, and marks the session DONE. */
export async function processFinal(sessionId: string): Promise<void> {
  const finalStart = Date.now();
  const session = await prisma.speakingSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      userId: true,
      status: true,
      chunkCount: true,
      isChunked: true,
      focusMetricKey: true,
      promptUsed: true,
      processedAt: true,
      createdAt: true,
    },
  });

  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  if (!session.isChunked) {
    throw new Error(`Session is not chunked: ${sessionId}`);
  }

  if (session.status === SessionStatus.DONE && session.processedAt != null) {
    return;
  }

  if (session.status === SessionStatus.AWAITING_FINAL) {
    await prisma.speakingSession.update({
      where: { id: sessionId },
      data: { status: SessionStatus.PROCESSING_FINAL },
    });
  }

  const chunks = await prisma.sessionChunk.findMany({
    where: { sessionId },
    orderBy: { chunkIndex: 'asc' },
  });

  if (session.chunkCount != null && chunks.length < session.chunkCount) {
    throw new Error(`Waiting for all chunks: ${chunks.length}/${session.chunkCount}`);
  }

  const incomplete = chunks.some((chunk) => chunk.status !== ChunkStatus.CHUNK_DONE);
  if (incomplete) {
    throw new Error('Not all chunks are processed yet');
  }

  const transcriptInput = chunks.map((chunk) => ({
    words: parseWords(chunk.words),
    overlapSecs: chunk.overlapSecs,
  }));

  const unified = concatenateChunkTranscripts(transcriptInput);
  const rawText = unified.text;
  const userTranscriptText = await polishTranscript(rawText);
  const wordCount = userTranscriptText.split(/\s+/).filter(Boolean).length;

  await prisma.transcript.upsert({
    where: { sessionId },
    create: { sessionId, text: userTranscriptText, wordCount },
    update: { text: userTranscriptText, wordCount },
  });

  const aggregated = aggregatePronunciation(
    chunks.map((chunk) => ({
      chunkIndex: chunk.chunkIndex,
      durationSecs: chunk.durationSecs,
      overlapSecs: chunk.overlapSecs,
      pronScore: chunk.pronScore,
      accuracyScore: chunk.accuracyScore,
      fluencyScore: chunk.fluencyScore,
      completenessScore: chunk.completenessScore,
      prosodyScore: chunk.prosodyScore,
      speakingRateWpm: chunk.speakingRateWpm,
      pronWords: parsePronWords(chunk.pronWords),
      pronRawJson: Array.isArray(chunk.pronRawJson) ? chunk.pronRawJson : null,
    })),
  );

  let pronunciationResult = aggregated ? toPronunciationResult(aggregated) : null;
  if (pronunciationResult) {
    pronunciationResult = {
      ...pronunciationResult,
      words: tagSpanishL1(pronunciationResult.words),
    };
    await persistPronunciation(sessionId, pronunciationResult);
  }

  const pronunciationSummary = buildPronunciationSummary(pronunciationResult);
  const analysis = await analyzeTranscript(
    userTranscriptText,
    session.focusMetricKey,
    pronunciationSummary,
    session.promptUsed ?? null,
  );

  const nerFilterResult = filterTranscriptionArtefacts(
    analysis.insights,
    userTranscriptText,
  );

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
    await prisma.metricSnapshot.deleteMany({
      where: { sessionId, key: { in: claudeKeys } },
    });
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
    await persistVocabSuggestions(session.userId, sessionId, analysis.vocabularySuggestions);

    const rewriteResult = await rewriteTranscript(userTranscriptText, analysis.vocabularySuggestions);
    if (rewriteResult) {
      await prisma.transcript.update({
        where: { sessionId },
        data: { improvedText: rewriteResult.improvedText, wordsUsed: rewriteResult.wordsUsed },
      });
    }
  }

  await detectVocabUsage(session.userId, sessionId, userTranscriptText);

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

  await updatePatternProfile(session.userId, nerFilterResult.kept);
  await invalidateDailySummary(session.userId, session.createdAt);

  // CEFR estimation from scored metrics
  const cefrEstimate = estimateCefr(
    analysis.metrics.map((m) => ({ key: m.key, score: m.score })),
  );
  if (cefrEstimate !== null) {
    await prisma.user.update({
      where: { id: session.userId },
      data: { estimatedCefrLevel: cefrEstimate.level },
    });
  }

  logPipelineStage({ sessionId, stage: 'processFinal', durationMs: Date.now() - finalStart, success: true, metadata: { chunkCount: chunks.length, wordCount } });

  logger.info(
    {
      sessionId,
      userId: session.userId,
      chunkCount: chunks.length,
      wordCount,
    },
    'Chunked session fan-in complete',
  );
}
