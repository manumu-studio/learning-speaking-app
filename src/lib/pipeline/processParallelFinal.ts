// Fan-in worker for the parallel chunk pipeline — stitches transcripts, merges pronunciation, synthesizes insights
import { Prisma, SessionStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { filterTranscriptionArtefacts } from '@/lib/ai/nerFilter';
import { tagSpanishL1 } from '@/lib/ai/l1Spanish';
import { updatePatternProfile } from '@/features/session/updatePatternProfile';
import { stitchTranscripts } from '@/lib/pipeline/stitchTranscripts';
import type { ChunkTranscriptInput } from '@/lib/pipeline/stitchTranscripts';
import { mergePronunciation } from '@/lib/pipeline/mergePronunciation';
import type { ChunkPronunciationMergeInput } from '@/lib/pipeline/mergePronunciation';
import { persistPronunciation } from '@/lib/pipeline/persistPronunciation';
import { synthesizeAnalysis } from '@/lib/ai/synthesize';
import type { ChunkInsightInput } from '@/lib/ai/synthesize';
import { persistVocabSuggestions } from '@/lib/pipeline/persistVocabSuggestions';
import { detectVocabUsage } from '@/lib/pipeline/detectVocabUsage';
import { polishTranscript } from '@/lib/ai/polishTranscript';
import { rewriteTranscript } from '@/lib/ai/rewriteTranscript';
import { logger } from '@/lib/logger';
import { logPipelineStage } from '@/lib/observability';
import { estimateCefr } from '@/lib/cefr/estimateCefr';
import { isJsonArray } from './processFinalHelpers';

/** Fan-in worker for the parallel chunk pipeline: polls until all ChunkResult rows settle, merges transcripts and pronunciation, synthesizes insights, and marks the session DONE. */
export async function processParallelFinal(sessionId: string): Promise<void> {
  const parallelFinalStart = Date.now();
  const session = await prisma.speakingSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      userId: true,
      status: true,
      focusMetricKey: true,
      promptUsed: true,
      processedAt: true,
      chunkCount: true,
    },
  });

  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }
  if (session.status === SessionStatus.DONE && session.processedAt != null) {
    return;
  }

  const expectedChunkCount = session.chunkCount ?? 0;
  const maxPollAttempts = 12;
  const pollIntervalMs = 10_000;

  let chunkResults = await prisma.chunkResult.findMany({
    where: { sessionId },
    orderBy: { chunkIndex: 'asc' },
  });

  for (let attempt = 1; attempt <= maxPollAttempts; attempt++) {
    const stillProcessing = chunkResults.filter((c) => c.status === 'PROCESSING');
    const allPresent = expectedChunkCount === 0 || chunkResults.length >= expectedChunkCount;

    if (allPresent && stillProcessing.length === 0) break;

    if (attempt === maxPollAttempts) {
      logger.warn(
        { sessionId, found: chunkResults.length, expected: expectedChunkCount, processing: stillProcessing.length },
        'Chunks did not settle after max poll attempts',
      );
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    chunkResults = await prisma.chunkResult.findMany({
      where: { sessionId },
      orderBy: { chunkIndex: 'asc' },
    });
  }

  if (chunkResults.length === 0) {
    throw new Error(`No ChunkResult rows found for session ${sessionId}`);
  }

  const doneChunks = chunkResults.filter((chunk) => chunk.status === 'DONE');
  const hasPartialResults = doneChunks.length < chunkResults.length;

  if (doneChunks.length === 0) {
    await prisma.speakingSession.update({
      where: { id: sessionId },
      data: { status: SessionStatus.FAILED, errorMessage: 'All chunks failed processing' },
    });
    return;
  }

  await prisma.speakingSession.update({
    where: { id: sessionId },
    data: { status: SessionStatus.PROCESSING_FINAL },
  });

  const transcriptInputs: ChunkTranscriptInput[] = doneChunks.map((chunk) => ({
    chunkIndex: chunk.chunkIndex,
    text: chunk.transcriptText ?? '',
    overlapSecs: chunk.overlapSecs,
  }));

  const rawStitched = stitchTranscripts(transcriptInputs);
  const stitchedTranscript = await polishTranscript(rawStitched);
  const wordCount = stitchedTranscript.split(/\s+/).filter(Boolean).length;

  await prisma.transcript.upsert({
    where: { sessionId },
    create: { sessionId, text: stitchedTranscript, wordCount },
    update: { text: stitchedTranscript, wordCount },
  });

  const pronInputs: ChunkPronunciationMergeInput[] = doneChunks.map((chunk) => ({
    chunkIndex: chunk.chunkIndex,
    durationSecs: chunk.durationSecs,
    overlapSecs: chunk.overlapSecs,
    pronunciationReport: chunk.pronunciationReport,
  }));

  const mergedPron = mergePronunciation(pronInputs);
  if (mergedPron) {
    const pronResult = {
      ...mergedPron,
      words: tagSpanishL1(mergedPron.words),
      failureReason: null,
      rawUtterances: [],
    };
    await persistPronunciation(sessionId, pronResult);
  }

  let cumulativeSecs = 0;
  const chunkInsightInputs: ChunkInsightInput[] = doneChunks.map((chunk) => {
    const startSecs = cumulativeSecs;
    const effectiveDuration = Math.max(
      0,
      chunk.durationSecs - (chunk.chunkIndex === 0 ? 0 : chunk.overlapSecs),
    );
    cumulativeSecs += effectiveDuration;
    return {
      chunkIndex: chunk.chunkIndex,
      startSecs,
      endSecs: cumulativeSecs,
      insights: isJsonArray(chunk.insights) ? [...chunk.insights] : [],
    };
  });

  const synthesis = await synthesizeAnalysis({
    stitchedTranscript,
    chunks: chunkInsightInputs,
    focusMetricKey: session.focusMetricKey,
    promptUsed: session.promptUsed,
  });

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
    const synthesisKeys = synthesis.metrics.map((m) => m.key);
    await prisma.metricSnapshot.deleteMany({
      where: { sessionId, key: { in: synthesisKeys } },
    });
    await prisma.metricSnapshot.createMany({
      data: synthesis.metrics.map((metric) => ({
        sessionId,
        key: metric.key,
        level: metric.level,
        score: metric.score,
        note: metric.note,
      })),
      skipDuplicates: true,
    });
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
    await persistVocabSuggestions(session.userId, sessionId, synthesis.vocabularySuggestions);

    const rewriteResult = await rewriteTranscript(stitchedTranscript, synthesis.vocabularySuggestions);
    if (rewriteResult) {
      await prisma.transcript.update({
        where: { sessionId },
        data: { improvedText: rewriteResult.improvedText, wordsUsed: rewriteResult.wordsUsed },
      });
    }
  }

  await updatePatternProfile(session.userId, nerFilterResult.kept);
  await detectVocabUsage(session.userId, sessionId, stitchedTranscript);

  // CEFR estimation from scored metrics
  const cefrEstimate = estimateCefr(
    synthesis.metrics.map((m) => ({ key: m.key, score: m.score })),
  );
  if (cefrEstimate !== null) {
    await prisma.user.update({
      where: { id: session.userId },
      data: { estimatedCefrLevel: cefrEstimate.level },
    });
  }

  logPipelineStage({ sessionId, stage: 'processParallelFinal', durationMs: Date.now() - parallelFinalStart, success: true, metadata: { chunkCount: doneChunks.length, wordCount } });

  logger.info(
    {
      sessionId,
      userId: session.userId,
      chunkCount: doneChunks.length,
      totalChunks: chunkResults.length,
      hasPartialResults,
      wordCount,
    },
    'Parallel chunk pipeline fan-in complete',
  );
}
