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
import { log } from '@/lib/logger';

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
    },
  });

  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  if (!session.isChunked) {
    throw new Error(`Session is not chunked: ${sessionId}`);
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

  if (analysis.metrics.length > 0) {
    await prisma.metricSnapshot.deleteMany({ where: { sessionId } });
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
    },
  });

  await updatePatternProfile(session.userId, nerFilterResult.kept);

  log({
    level: 'info',
    message: 'Chunked session fan-in complete',
    sessionId,
    userId: session.userId,
    metadata: { chunkCount: chunks.length, wordCount },
  });
}
