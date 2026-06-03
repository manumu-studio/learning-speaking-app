// Fan-in worker — deduplicates chunk transcripts, aggregates pronunciation, runs Claude once
import { ChunkStatus, Prisma, SessionStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { analyzeTranscript } from '@/lib/ai/analyze';
import type { AnalysisResult } from '@/lib/ai/analyze';
import { buildCorpusEvidence } from '@/lib/analysis/buildCorpusEvidence';
import type { CorpusEvidence } from '@/lib/analysis/analysis.types';
import { filterTranscriptionArtefacts } from '@/lib/ai/nerFilter';
import { tagSpanishL1 } from '@/lib/ai/l1Spanish';
import { updatePatternProfile } from '@/features/session/updatePatternProfile';
import { aggregatePronunciation, toPronunciationResult } from '@/lib/pipeline/aggregatePronunciation';
import type { SessionChunk } from '@prisma/client';
import { concatenateChunkTranscripts } from '@/lib/pipeline/transcriptDedup';
import { persistPronunciation } from '@/lib/pipeline/persistPronunciation';
import { persistVocabSuggestions } from '@/lib/pipeline/persistVocabSuggestions';
import { detectVocabUsage } from '@/lib/pipeline/detectVocabUsage';
import { polishTranscript } from '@/lib/ai/polishTranscript';
import { rewriteTranscript } from '@/lib/ai/rewriteTranscript';
import { logger } from '@/lib/logger';
import { logPipelineStage } from '@/lib/observability';
import { estimateCefr } from '@/lib/cefr/estimateCefr';
import type { PronunciationResult } from '@/lib/ai/azurePronunciation.types';
import { detectCalques } from '@/lib/naturalness/detectCalques';
import { mergeNaturalnessFlags } from '@/lib/naturalness/confidenceGate';
import { persistNaturalnessFlags } from '@/lib/pipeline/persistNaturalness';
import { buildPronunciationSummary, parseWords, parsePronWords, invalidateDailySummary } from './processFinalHelpers';

export { processParallelFinal } from './processParallelFinal';

// ---------------------------------------------------------------------------
// Pronunciation aggregation helper
// ---------------------------------------------------------------------------

/**
 * Aggregates per-chunk pronunciation data, tags L1 errors, and persists the result.
 *
 * @param sessionId - ID of the session.
 * @param chunks - Ordered array of SessionChunk rows.
 * @returns The merged `PronunciationResult`, or `null` if aggregation yields nothing.
 */
async function aggregatePronunciationForSession(
  sessionId: string,
  chunks: SessionChunk[],
): Promise<PronunciationResult | null> {
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

  if (!aggregated) return null;

  const result: PronunciationResult = {
    ...toPronunciationResult(aggregated),
    words: tagSpanishL1(toPronunciationResult(aggregated).words),
  };

  await persistPronunciation(sessionId, result);
  return result;
}

// ---------------------------------------------------------------------------
// Analysis persistence helper
// ---------------------------------------------------------------------------

interface PersistAnalysisOptions {
  sessionId: string;
  userId: string;
  userTranscriptText: string;
  analysis: AnalysisResult;
  chunks: SessionChunk[];
  createdAt: Date;
  corpusEvidence?: CorpusEvidence | null;
}

/**
 * Persists Claude analysis results (insights, metrics, vocab, transcript rewrite,
 * session fields, pattern profile, CEFR) and invalidates the daily summary cache.
 *
 * @param opts - All data needed to write analysis results to the DB.
 */
async function persistAnalysisAndFinalize(opts: PersistAnalysisOptions): Promise<void> {
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

// ---------------------------------------------------------------------------
// Corpus evidence helper
// ---------------------------------------------------------------------------

async function buildCorpusEvidenceWithLogging(
  sessionId: string,
  transcript: string,
): Promise<CorpusEvidence> {
  const corpusStart = Date.now();
  const evidence = await buildCorpusEvidence(transcript);
  logPipelineStage({
    sessionId,
    stage: 'corpus-lookup',
    durationMs: Date.now() - corpusStart,
    success: true,
    metadata: {
      contentWords: evidence.stats.totalContentWords,
      matched: evidence.stats.matchedWords,
      collocations: evidence.collocations.filter((c) => c.lookup !== null).length,
      expressions: evidence.expressions.length,
    },
  });
  return evidence;
}

// ---------------------------------------------------------------------------
// Main fan-in entry point
// ---------------------------------------------------------------------------

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

  if (!session) throw new Error(`Session not found: ${sessionId}`);
  if (!session.isChunked) throw new Error(`Session is not chunked: ${sessionId}`);
  if (session.status === SessionStatus.DONE && session.processedAt != null) return;

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

  if (chunks.some((chunk) => chunk.status !== ChunkStatus.CHUNK_DONE)) {
    throw new Error('Not all chunks are processed yet');
  }

  const transcriptInput = chunks.map((chunk) => ({
    words: parseWords(chunk.words),
    overlapSecs: chunk.overlapSecs,
  }));

  const unified = concatenateChunkTranscripts(transcriptInput);
  const userTranscriptText = await polishTranscript(unified.text);
  const wordCount = userTranscriptText.split(/\s+/).filter(Boolean).length;

  await prisma.transcript.upsert({
    where: { sessionId },
    create: { sessionId, text: userTranscriptText, wordCount },
    update: { text: userTranscriptText, wordCount },
  });

  const pronunciationResult = await aggregatePronunciationForSession(sessionId, chunks);
  const pronunciationSummary = buildPronunciationSummary(pronunciationResult);

  const corpusEvidence = await buildCorpusEvidenceWithLogging(sessionId, userTranscriptText);

  const analysis = await analyzeTranscript({
    transcript: userTranscriptText,
    focusMetricKey: session.focusMetricKey,
    pronunciationSummary,
    promptUsed: session.promptUsed ?? null,
    corpusEvidence,
  });

  await persistAnalysisAndFinalize({
    sessionId,
    userId: session.userId,
    userTranscriptText,
    analysis,
    chunks,
    createdAt: session.createdAt,
    corpusEvidence,
  });

  logPipelineStage({
    sessionId,
    stage: 'processFinal',
    durationMs: Date.now() - finalStart,
    success: true,
    metadata: { chunkCount: chunks.length, wordCount },
  });

  logger.info(
    { sessionId, userId: session.userId, chunkCount: chunks.length, wordCount },
    'Chunked session fan-in complete',
  );
}
