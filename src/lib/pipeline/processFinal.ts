// Fan-in worker — deduplicates chunk transcripts, aggregates pronunciation, runs Claude once
import { ChunkStatus, SessionStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { analyzeTranscript } from '@/lib/ai/analyze';
import { buildCorpusEvidence } from '@/lib/analysis/buildCorpusEvidence';
import type { CorpusEvidence } from '@/lib/analysis/analysis.types';
import { tagSpanishL1 } from '@/lib/ai/l1Spanish';
import { aggregatePronunciation, toPronunciationResult } from '@/lib/pipeline/aggregatePronunciation';
import type { SessionChunk } from '@prisma/client';
import { concatenateChunkTranscripts } from '@/lib/pipeline/transcriptDedup';
import { persistPronunciation } from '@/lib/pipeline/persistPronunciation';
import { polishTranscript } from '@/lib/ai/polishTranscript';
import { logger } from '@/lib/logger';
import { logPipelineStage } from '@/lib/observability';
import type { PronunciationResult } from '@/lib/ai/azurePronunciation.types';
import { persistAnalysisAndFinalize } from '@/lib/pipeline/persistAnalysis';
import { buildPronunciationSummary, parseWords, parsePronWords } from './processFinalHelpers';

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
