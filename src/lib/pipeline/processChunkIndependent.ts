// Runs full Whisper + Azure + Claude pipeline on one chunk, stores in ChunkResult
/* eslint-disable complexity, max-lines-per-function */
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

/** Runs the full Whisper + Azure + Claude pipeline on a single chunk and stores the result in ChunkResult for later fan-in aggregation. */
export async function processChunkIndependent(input: ChunkIndependentInput): Promise<void> {
  const { sessionId, chunkIndex, storageKey, durationSecs, overlapSecs } = input;

  await prisma.chunkResult.upsert({
    where: { sessionId_chunkIndex: { sessionId, chunkIndex } },
    create: {
      sessionId,
      chunkIndex,
      overlapSecs,
      durationSecs,
      status: 'PROCESSING',
    },
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

    let pronunciationReport: Prisma.InputJsonValue | typeof Prisma.JsonNull = Prisma.JsonNull;
    if (
      env.AZURE_SPEECH_KEY !== undefined &&
      env.AZURE_SPEECH_REGION !== undefined &&
      transcriptText.length > 0
    ) {
      await prisma.speakingSession.updateMany({
        where: { id: sessionId, status: SessionStatus.TRANSCRIBING },
        data: { status: SessionStatus.SCORING },
      });

      try {
        const pronResult = await assessPronunciation(
          audioBuffer,
          transcriptText,
          env.AZURE_SPEECH_KEY,
          env.AZURE_SPEECH_REGION,
        );
        const taggedWords = tagSpanishL1(pronResult.words);
        pronunciationReport = toInputJson({
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
      }
    }

    await prisma.speakingSession.updateMany({
      where: { id: sessionId, status: { in: [SessionStatus.TRANSCRIBING, SessionStatus.SCORING] } },
      data: { status: SessionStatus.ANALYZING },
    });

    const session = await prisma.speakingSession.findUnique({
      where: { id: sessionId },
      select: { focusMetricKey: true, promptUsed: true },
    });

    let insightsJson: Prisma.InputJsonValue | typeof Prisma.JsonNull = Prisma.JsonNull;
    try {
      const analysis = await analyzeTranscript(
        transcriptText,
        session?.focusMetricKey ?? null,
        null,
        session?.promptUsed ?? null,
      );
      insightsJson = toInputJson(analysis.insights);
    } catch (analysisError) {
      logger.warn(
        {
          sessionId,
          chunkIndex,
          err: analysisError instanceof Error ? analysisError : new Error('Unknown'),
        },
        'Per-chunk Claude analysis failed — continuing',
      );
    }

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
