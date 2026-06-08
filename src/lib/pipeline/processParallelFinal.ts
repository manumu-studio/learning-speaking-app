// Fan-in worker for the parallel chunk pipeline — stitches transcripts, merges pronunciation, synthesizes insights
import { SessionStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { tagSpanishL1 } from '@/lib/ai/l1Spanish';
import { stitchTranscripts } from '@/lib/pipeline/stitchTranscripts';
import type { ChunkTranscriptInput } from '@/lib/pipeline/stitchTranscripts';
import { mergePronunciation } from '@/lib/pipeline/mergePronunciation';
import type { ChunkPronunciationMergeInput } from '@/lib/pipeline/mergePronunciation';
import { persistPronunciation } from '@/lib/pipeline/persistPronunciation';
import { synthesizeAnalysis } from '@/lib/ai/synthesize';
import type { ChunkInsightInput } from '@/lib/ai/synthesize';
import { polishTranscript } from '@/lib/ai/polishTranscript';
import { logger } from '@/lib/logger';
import { logPipelineStage } from '@/lib/observability';
import { runGrammarAnalysis } from '@/lib/pipeline/runGrammarAnalysis';
import { stitchVerbatimAndPersist } from '@/lib/pipeline/stitchVerbatim';
import { persistSynthesisResults } from '@/lib/pipeline/persistSynthesisResults';
import { isJsonArray } from './processFinalHelpers';
import { upsertDeterministicFiller } from '@/lib/pipeline/upsertDeterministicFiller';
import { insightSchema } from '@/lib/ai/analyze';
import type { ChunkResult } from '@prisma/client';

// ---------------------------------------------------------------------------
// Chunk polling helper
// ---------------------------------------------------------------------------

const MAX_POLL_ATTEMPTS = 12;
const POLL_INTERVAL_MS = 10_000;

/**
 * Polls ChunkResult rows until all expected chunks settle (DONE or FAILED),
 * or the maximum number of attempts is reached.
 *
 * @param sessionId - ID of the session.
 * @param expectedChunkCount - How many ChunkResult rows are expected (0 = unknown).
 * @returns The final array of ChunkResult rows after polling.
 */
async function pollChunkResults(
  sessionId: string,
  expectedChunkCount: number,
): Promise<ChunkResult[]> {
  let chunkResults = await prisma.chunkResult.findMany({
    where: { sessionId },
    orderBy: { chunkIndex: 'asc' },
  });

  for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt++) {
    const stillProcessing = chunkResults.filter((c) => c.status === 'PROCESSING');
    const allPresent = expectedChunkCount === 0 || chunkResults.length >= expectedChunkCount;

    if (allPresent && stillProcessing.length === 0) break;

    if (attempt === MAX_POLL_ATTEMPTS) {
      logger.warn(
        { sessionId, found: chunkResults.length, expected: expectedChunkCount, processing: stillProcessing.length },
        'Chunks did not settle after max poll attempts',
      );
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    chunkResults = await prisma.chunkResult.findMany({
      where: { sessionId },
      orderBy: { chunkIndex: 'asc' },
    });
  }

  return chunkResults;
}

// ---------------------------------------------------------------------------
// Pronunciation merge + persist helper
// ---------------------------------------------------------------------------

/**
 * Merges per-chunk pronunciation reports, tags L1 errors, and persists the result.
 *
 * @param sessionId - ID of the session.
 * @param doneChunks - Chunks with status DONE (containing pronunciation reports).
 */
async function mergeAndPersistPronunciation(
  sessionId: string,
  doneChunks: ChunkResult[],
): Promise<void> {
  const pronInputs: ChunkPronunciationMergeInput[] = doneChunks.map((chunk) => ({
    chunkIndex: chunk.chunkIndex,
    durationSecs: chunk.durationSecs,
    overlapSecs: chunk.overlapSecs,
    pronunciationReport: chunk.pronunciationReport,
  }));

  const mergedPron = mergePronunciation(pronInputs);
  if (!mergedPron) return;

  const pronResult = {
    ...mergedPron,
    words: tagSpanishL1(mergedPron.words),
    failureReason: null,
    rawUtterances: [],
  };
  await persistPronunciation(sessionId, pronResult);
}

// ---------------------------------------------------------------------------
// Transcript stitch + store helper
// ---------------------------------------------------------------------------

interface StitchResult {
  stitchedTranscript: string;
  wordCount: number;
}

/**
 * Stitches done-chunk transcripts, polishes them with Claude, stores in DB, and returns
 * the polished text with its word count.
 *
 * @param sessionId - ID of the session.
 * @param doneChunks - ChunkResult rows whose status is DONE.
 * @returns The polished transcript and its word count.
 */
async function stitchAndStoreTranscript(
  sessionId: string,
  doneChunks: ChunkResult[],
): Promise<StitchResult> {
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

  return { stitchedTranscript, wordCount };
}

// ---------------------------------------------------------------------------
// Chunk insight input builder
// ---------------------------------------------------------------------------

/**
 * Converts done ChunkResult rows into `ChunkInsightInput[]` for synthesis,
 * computing cumulative time offsets and validating each stored insight against
 * the canonical insight schema.
 *
 * @param doneChunks - ChunkResult rows whose status is DONE.
 * @returns Typed array of chunk insight inputs ready for `synthesizeAnalysis`.
 */
function buildChunkInsightInputs(doneChunks: ChunkResult[]): ChunkInsightInput[] {
  let cumulativeSecs = 0;
  return doneChunks.map((chunk) => {
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
      insights: isJsonArray(chunk.insights)
        ? chunk.insights.filter((entry) => insightSchema.safeParse(entry).success)
        : [],
    };
  });
}

// ---------------------------------------------------------------------------
// Main fan-in entry point
// ---------------------------------------------------------------------------

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
      createdAt: true,
      chunkCount: true,
    },
  });

  if (!session) throw new Error(`Session not found: ${sessionId}`);
  if (session.status === SessionStatus.DONE && session.processedAt != null) return;

  const chunkResults = await pollChunkResults(sessionId, session.chunkCount ?? 0);

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

  const { stitchedTranscript, wordCount } = await stitchAndStoreTranscript(sessionId, doneChunks);

  await mergeAndPersistPronunciation(sessionId, doneChunks);

  const verbatimResult = await stitchVerbatimAndPersist(sessionId, stitchedTranscript, doneChunks);

  const chunkInsightInputs = buildChunkInsightInputs(doneChunks);

  const synthesis = await synthesizeAnalysis({
    stitchedTranscript,
    ...(verbatimResult ? { verbatimTranscript: verbatimResult.filtered.text } : {}),
    chunks: chunkInsightInputs,
    focusMetricKey: session.focusMetricKey,
    promptUsed: session.promptUsed,
  });

  await persistSynthesisResults({
    sessionId,
    userId: session.userId,
    stitchedTranscript,
    synthesis,
    doneChunks,
    hasPartialResults,
    createdAt: session.createdAt,
  });

  const filteredVerbatimText = verbatimResult?.filtered.text;
  if (filteredVerbatimText) await upsertDeterministicFiller(sessionId, filteredVerbatimText);

  await runGrammarAnalysis(
    sessionId, stitchedTranscript,
    filteredVerbatimText ? { verbatimTranscript: filteredVerbatimText } : undefined,
  );

  logPipelineStage({
    sessionId,
    stage: 'processParallelFinal',
    durationMs: Date.now() - parallelFinalStart,
    success: true,
    metadata: { chunkCount: doneChunks.length, wordCount },
  });
  logger.info(
    { sessionId, userId: session.userId, chunkCount: doneChunks.length, totalChunks: chunkResults.length, hasPartialResults, wordCount },
    'Parallel chunk pipeline fan-in complete',
  );
}
