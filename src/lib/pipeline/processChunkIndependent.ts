// Runs full Whisper + Azure + Claude pipeline on one chunk, stores in ChunkResult
import { Prisma, SessionStatus } from '@prisma/client';
import { analyzeTranscript } from '@/lib/ai/analyze';
import { assessPronunciation } from '@/lib/ai/azurePronunciation';
import { tagSpanishL1 } from '@/lib/ai/l1Spanish';
import { transcribeWavChunk } from '@/lib/ai/whisper';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { deleteAudio, getAudio } from '@/lib/storage/r2';
import { toInputJson } from '@/lib/prismaJson';

export interface ChunkIndependentInput {
  sessionId: string;
  chunkIndex: number;
  storageKey: string;
  durationSecs: number;
  overlapSecs: number;
}

interface PronunciationRunOptions {
  sessionId: string;
  chunkIndex: number;
  audioBuffer: Buffer;
  transcriptText: string;
  azureKey: string;
  azureRegion: string;
}

/**
 * Runs Azure pronunciation assessment for a single chunk.
 * Returns serialisable JSON for storage, or `Prisma.JsonNull` on failure.
 *
 * @param opts - Chunk-level inputs for pronunciation assessment.
 * @returns A `Prisma.InputJsonValue` or `Prisma.JsonNull` sentinel.
 */
async function runChunkPronunciation(
  opts: PronunciationRunOptions,
): Promise<Prisma.InputJsonValue | typeof Prisma.JsonNull> {
  const { sessionId, chunkIndex, audioBuffer, transcriptText, azureKey, azureRegion } = opts;

  await prisma.speakingSession.updateMany({
    where: { id: sessionId, status: SessionStatus.TRANSCRIBING },
    data: { status: SessionStatus.SCORING },
  });

  try {
    const pronResult = await assessPronunciation(audioBuffer, transcriptText, azureKey, azureRegion);
    const taggedWords = tagSpanishL1(pronResult.words);
    return toInputJson({
      pronScore: pronResult.pronScore,
      accuracyScore: pronResult.accuracyScore,
      fluencyScore: pronResult.fluencyScore,
      completenessScore: pronResult.completenessScore,
      prosodyScore: pronResult.prosodyScore,
      words: taggedWords,
    });
  } catch (pronError) {
    logger.warn(
      {
        sessionId,
        chunkIndex,
        err: pronError instanceof Error ? pronError : new Error('Unknown'),
      },
      'Per-chunk pronunciation failed — continuing',
    );
    return Prisma.JsonNull;
  }
}

interface AnalysisRunOptions {
  sessionId: string;
  chunkIndex: number;
  transcriptText: string;
}

/**
 * Runs Claude analysis on a single chunk transcript.
 * Returns serialisable insights JSON, or `Prisma.JsonNull` on failure.
 *
 * @param opts - Chunk-level inputs for analysis.
 * @returns A `Prisma.InputJsonValue` or `Prisma.JsonNull` sentinel.
 */
async function runChunkAnalysis(
  opts: AnalysisRunOptions,
): Promise<Prisma.InputJsonValue | typeof Prisma.JsonNull> {
  const { sessionId, chunkIndex, transcriptText } = opts;

  const session = await prisma.speakingSession.findUnique({
    where: { id: sessionId },
    select: { focusMetricKey: true, promptUsed: true },
  });

  try {
    const analysis = await analyzeTranscript({
      transcript: transcriptText,
      focusMetricKey: session?.focusMetricKey ?? null,
      pronunciationSummary: null,
      promptUsed: session?.promptUsed ?? null,
    });
    return toInputJson(analysis.insights);
  } catch (analysisError) {
    logger.warn(
      {
        sessionId,
        chunkIndex,
        err: analysisError instanceof Error ? analysisError : new Error('Unknown'),
      },
      'Per-chunk Claude analysis failed — continuing',
    );
    return Prisma.JsonNull;
  }
}

/** Runs the full Whisper + Azure + Claude pipeline on a single chunk and stores the result in ChunkResult for later fan-in aggregation. */
export async function processChunkIndependent(input: ChunkIndependentInput): Promise<void> {
  const { sessionId, chunkIndex, storageKey, durationSecs, overlapSecs } = input;

  await prisma.chunkResult.upsert({
    where: { sessionId_chunkIndex: { sessionId, chunkIndex } },
    create: { sessionId, chunkIndex, overlapSecs, durationSecs, status: 'PROCESSING' },
    update: { status: 'PROCESSING' },
  });

  try {
    await prisma.speakingSession.updateMany({
      where: { id: sessionId, status: SessionStatus.CHUNKS_PROCESSING },
      data: { status: SessionStatus.TRANSCRIBING },
    });

    const audioBuffer = await getAudio(storageKey);
    const whisperResult = await transcribeWavChunk(
      audioBuffer,
      `session-${sessionId}-chunk-${chunkIndex}.wav`,
    );

    const transcriptText = whisperResult.text.trim();
    const wordCount = transcriptText.split(/\s+/).filter(Boolean).length;
    const words = whisperResult.words ?? [];

    const pronunciationReport: Prisma.InputJsonValue | typeof Prisma.JsonNull =
      env.AZURE_SPEECH_KEY !== undefined &&
      env.AZURE_SPEECH_REGION !== undefined &&
      transcriptText.length > 0
        ? await runChunkPronunciation({
            sessionId,
            chunkIndex,
            audioBuffer,
            transcriptText,
            azureKey: env.AZURE_SPEECH_KEY,
            azureRegion: env.AZURE_SPEECH_REGION,
          })
        : Prisma.JsonNull;

    await prisma.speakingSession.updateMany({
      where: { id: sessionId, status: { in: [SessionStatus.TRANSCRIBING, SessionStatus.SCORING] } },
      data: { status: SessionStatus.ANALYZING },
    });

    const insightsJson = await runChunkAnalysis({ sessionId, chunkIndex, transcriptText });

    await prisma.chunkResult.update({
      where: { sessionId_chunkIndex: { sessionId, chunkIndex } },
      data: {
        status: 'DONE',
        transcriptText,
        wordCount,
        words: toInputJson(words),
        pronunciationReport,
        insights: insightsJson,
      },
    });

    try {
      await deleteAudio(storageKey);
    } catch (deleteError) {
      logger.warn(
        {
          sessionId,
          chunkIndex,
          err: deleteError instanceof Error ? deleteError : new Error('Unknown'),
        },
        'Failed to delete chunk audio from R2',
      );
    }

    logger.info({ sessionId, chunkIndex, wordCount }, 'Independent chunk pipeline complete');
  } catch (error) {
    await prisma.chunkResult
      .update({
        where: { sessionId_chunkIndex: { sessionId, chunkIndex } },
        data: { status: 'FAILED' },
      })
      .catch(() => undefined);

    throw error;
  }
}
