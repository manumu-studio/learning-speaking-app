// Fan-in worker — deduplicates chunk transcripts, aggregates pronunciation, runs Claude once
import { ChunkStatus, Prisma, SessionStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { analyzeTranscript } from '@/lib/ai/analyze';
import type { PronunciationSummary } from '@/lib/ai/analyze';
import { filterTranscriptionArtefacts } from '@/lib/ai/nerFilter';
import { tagSpanishL1 } from '@/lib/ai/l1Spanish';
import { updatePatternProfile } from '@/features/session/updatePatternProfile';
import { aggregatePronunciation, toPronunciationResult } from '@/lib/pipeline/aggregatePronunciation';
import { concatenateChunkTranscripts } from '@/lib/pipeline/transcriptDedup';
import type { TranscriptWord } from '@/lib/pipeline/transcriptDedup';
import type { WordResult } from '@/lib/ai/azurePronunciation.types';
import { persistPronunciation } from '@/lib/pipeline/persistPronunciation';
import { stitchTranscripts } from '@/lib/pipeline/stitchTranscripts';
import type { ChunkTranscriptInput } from '@/lib/pipeline/stitchTranscripts';
import { mergePronunciation } from '@/lib/pipeline/mergePronunciation';
import type { ChunkPronunciationMergeInput } from '@/lib/pipeline/mergePronunciation';
import { synthesizeAnalysis } from '@/lib/ai/synthesize';
import type { ChunkInsightInput } from '@/lib/ai/synthesize';
import { logger } from '@/lib/logger';

function buildPronunciationSummary(
  result: ReturnType<typeof toPronunciationResult> | null,
): PronunciationSummary | null {
  if (result == null) {
    return null;
  }

  const weakPhonemes = result.words
    .flatMap((word) => word.phonemes)
    .filter((phoneme) => phoneme.accuracyScore < 60)
    .map((phoneme) => phoneme.phoneme)
    .slice(0, 5);

  const l1Tags = [...new Set(result.words.flatMap((word) => word.l1Tags ?? []))];

  return {
    topWeakPhonemes: weakPhonemes,
    l1Tags,
    accuracyScore: result.accuracyScore,
    prosodyScore: result.prosodyScore,
  };
}

function parseWords(value: Prisma.JsonValue | null): TranscriptWord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (
      typeof entry === 'object' &&
      entry !== null &&
      'word' in entry &&
      'start' in entry &&
      'end' in entry &&
      typeof entry.word === 'string' &&
      typeof entry.start === 'number' &&
      typeof entry.end === 'number'
    ) {
      return [{ word: entry.word, start: entry.start, end: entry.end }];
    }
    return [];
  });
}

function isWordResultLike(
  entry: unknown,
): entry is WordResult {
  return (
    typeof entry === 'object' &&
    entry !== null &&
    'word' in entry &&
    'accuracyScore' in entry &&
    'offsetMs' in entry &&
    'durationMs' in entry &&
    'phonemes' in entry &&
    typeof (entry as Record<string, unknown>).word === 'string' &&
    typeof (entry as Record<string, unknown>).accuracyScore === 'number' &&
    typeof (entry as Record<string, unknown>).offsetMs === 'number' &&
    typeof (entry as Record<string, unknown>).durationMs === 'number' &&
    Array.isArray((entry as Record<string, unknown>).phonemes)
  );
}

function parsePronWords(value: Prisma.JsonValue | null): WordResult[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const results = value.flatMap((entry) =>
    isWordResultLike(entry) ? [entry] : [],
  );
  return results.length === value.length ? results : null;
}

export async function processFinal(sessionId: string): Promise<void> {
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
  const userTranscriptText = unified.text;
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
    // Delete only Claude-scored metrics — preserve pronunciation metrics created by persistPronunciation
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

function isJsonArray(value: Prisma.JsonValue | null): value is Prisma.JsonArray {
  return Array.isArray(value);
}

export async function processParallelFinal(sessionId: string): Promise<void> {
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

  const stitchedTranscript = stitchTranscripts(transcriptInputs);
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
    await prisma.metricSnapshot.deleteMany({ where: { sessionId } });
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

  await updatePatternProfile(session.userId, nerFilterResult.kept);

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
