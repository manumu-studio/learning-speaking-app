// Processes a single uploaded session chunk — Whisper transcription and Azure pronunciation scoring
import { ChunkStatus, Prisma, SessionStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { transcribeWavChunk } from '@/lib/ai/whisper';
import { assessPronunciation } from '@/lib/ai/azurePronunciation';
import { tagSpanishL1 } from '@/lib/ai/l1Spanish';
import { deleteAudio, getAudio } from '@/lib/storage/r2';
import { extractChunkFeatures } from '@/lib/pipeline/extractFeatures';
import { enqueueFinalProcessing } from '@/lib/queue/qstash';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export async function maybeEnqueueFinalProcessing(sessionId: string): Promise<void> {
  const session = await prisma.speakingSession.findUnique({
    where: { id: sessionId },
    select: { chunkCount: true, isChunked: true, status: true },
  });

  if (!session?.isChunked || session.chunkCount == null) {
    return;
  }

  const doneCount = await prisma.sessionChunk.count({
    where: { sessionId, status: ChunkStatus.CHUNK_DONE },
  });

  if (doneCount !== session.chunkCount) {
    return;
  }

  if (
    session.status !== SessionStatus.AWAITING_FINAL &&
    session.status !== SessionStatus.PROCESSING_FINAL &&
    session.status !== SessionStatus.DONE
  ) {
    await prisma.speakingSession.update({
      where: { id: sessionId },
      data: { status: SessionStatus.AWAITING_FINAL },
    });
  }

  const result = await prisma.speakingSession.updateMany({
    where: { id: sessionId, status: SessionStatus.AWAITING_FINAL },
    data: { status: SessionStatus.PROCESSING_FINAL },
  });

  if (result.count === 0) {
    return;
  }

  await enqueueFinalProcessing(sessionId);
}

export async function processChunk(
  sessionId: string,
  chunkIndex: number,
): Promise<void> {
  const chunk = await prisma.sessionChunk.findUnique({
    where: {
      sessionId_chunkIndex: { sessionId, chunkIndex },
    },
    include: {
      session: {
        select: {
          id: true,
          userId: true,
          status: true,
          isChunked: true,
        },
      },
    },
  });

  if (!chunk) {
    throw new Error(`Chunk not found: ${sessionId}/${chunkIndex}`);
  }

  const audioKey = chunk.audioUrl;
  if (!audioKey) {
    throw new Error(`Chunk missing audio URL: ${sessionId}/${chunkIndex}`);
  }

  if (chunk.status === ChunkStatus.CHUNK_DONE) {
    await maybeEnqueueFinalProcessing(sessionId);
    return;
  }

  await prisma.sessionChunk.update({
    where: { id: chunk.id },
    data: { status: ChunkStatus.TRANSCRIBING },
  });

  if (chunk.session.status === SessionStatus.UPLOADED) {
    await prisma.speakingSession.update({
      where: { id: sessionId },
      data: { status: SessionStatus.CHUNKS_PROCESSING },
    });
  }

  const audioBuffer = await getAudio(audioKey);
  const whisperResult = await transcribeWavChunk(
    audioBuffer,
    `session-${sessionId}-chunk-${chunkIndex}.wav`,
  );

  const transcriptText = whisperResult.text.trim();
  const wordCount = transcriptText.split(/\s+/).filter(Boolean).length;
  const words = whisperResult.words ?? [];

  await prisma.sessionChunk.update({
    where: { id: chunk.id },
    data: {
      status: ChunkStatus.SCORING,
      transcriptText,
      words: toJson(words),
      wordCount,
    },
  });

  let pronScore: number | null = null;
  let accuracyScore: number | null = null;
  let fluencyScore: number | null = null;
  let completenessScore: number | null = null;
  let prosodyScore: number | null = null;
  let speakingRateWpm: number | null = null;
  let pronWords: Prisma.InputJsonValue | typeof Prisma.JsonNull = Prisma.JsonNull;
  let pronRawJson: Prisma.InputJsonValue | typeof Prisma.JsonNull = Prisma.JsonNull;

  if (
    env.AZURE_SPEECH_KEY !== undefined &&
    env.AZURE_SPEECH_REGION !== undefined &&
    transcriptText.length > 0
  ) {
    try {
      const pronunciationResult = await assessPronunciation(
        audioBuffer,
        transcriptText,
        env.AZURE_SPEECH_KEY,
        env.AZURE_SPEECH_REGION,
      );
      const taggedWords = tagSpanishL1(pronunciationResult.words);

      pronScore = pronunciationResult.pronScore;
      accuracyScore = pronunciationResult.accuracyScore;
      fluencyScore = pronunciationResult.fluencyScore;
      completenessScore = pronunciationResult.completenessScore;
      prosodyScore = pronunciationResult.prosodyScore;

      const validWords = taggedWords.filter(
        (word) => word.errorType !== 'Insertion' && word.errorType !== 'Omission',
      );
      const totalDurationMs = validWords.reduce((sum, word) => sum + word.durationMs, 0);
      speakingRateWpm =
        totalDurationMs > 0
          ? (validWords.length / (totalDurationMs / 60_000))
          : 0;

      pronWords = toJson(taggedWords);
      pronRawJson = toJson(pronunciationResult.rawUtterances);
    } catch (error) {
      logger.warn(
        {
          sessionId,
          chunkIndex,
          err: error instanceof Error ? error : new Error('Unknown error'),
        },
        'Chunk pronunciation assessment failed',
      );
    }
  }

  await prisma.sessionChunk.update({
    where: { id: chunk.id },
    data: {
      status: ChunkStatus.CHUNK_DONE,
      pronScore,
      accuracyScore,
      fluencyScore,
      completenessScore,
      prosodyScore,
      speakingRateWpm,
      pronWords,
      pronRawJson,
    },
  });

  try {
    await extractChunkFeatures(
      sessionId,
      chunkIndex,
      audioKey,
      chunk.durationSecs,
      chunk.overlapSecs,
    );
  } catch (featureError) {
    logger.warn(
      {
        sessionId,
        chunkIndex,
        err: featureError instanceof Error ? featureError : new Error('Unknown error'),
      },
      'Chunk feature extraction failed — continuing pipeline',
    );
  }

  try {
    await deleteAudio(audioKey);
    await prisma.sessionChunk.update({
      where: { id: chunk.id },
      data: { audioDeletedAt: new Date(), audioUrl: null },
    });
  } catch (deleteError) {
    logger.warn(
      {
        sessionId,
        chunkIndex,
        err: deleteError instanceof Error ? deleteError : new Error('Unknown error'),
      },
      'Failed to delete chunk audio from R2',
    );
  }

  await maybeEnqueueFinalProcessing(sessionId);
}
