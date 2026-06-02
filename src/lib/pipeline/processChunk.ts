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
import { logPipelineStage } from '@/lib/observability';
import { toInputJson } from '@/lib/prismaJson';

// ---------------------------------------------------------------------------
// Pronunciation scoring
// ---------------------------------------------------------------------------

interface PronScores {
  pronScore: number | null;
  accuracyScore: number | null;
  fluencyScore: number | null;
  completenessScore: number | null;
  prosodyScore: number | null;
  speakingRateWpm: number | null;
  pronWords: Prisma.InputJsonValue | typeof Prisma.JsonNull;
  pronRawJson: Prisma.InputJsonValue | typeof Prisma.JsonNull;
}

const nullPronScores: PronScores = {
  pronScore: null,
  accuracyScore: null,
  fluencyScore: null,
  completenessScore: null,
  prosodyScore: null,
  speakingRateWpm: null,
  pronWords: Prisma.JsonNull,
  pronRawJson: Prisma.JsonNull,
};

async function scoreChunkPronunciation(
  sessionId: string,
  chunkIndex: number,
  audioBuffer: Buffer,
  transcriptText: string,
): Promise<PronScores> {
  const azureKey = env.AZURE_SPEECH_KEY;
  const azureRegion = env.AZURE_SPEECH_REGION;

  if (azureKey === undefined || azureRegion === undefined || transcriptText.length === 0) {
    return nullPronScores;
  }

  try {
    const pronunciationResult = await assessPronunciation(
      audioBuffer,
      transcriptText,
      azureKey,
      azureRegion,
    );
    const taggedWords = tagSpanishL1(pronunciationResult.words);

    const validWords = taggedWords.filter(
      (word) => word.errorType !== 'Insertion' && word.errorType !== 'Omission',
    );
    const totalDurationMs = validWords.reduce((sum, word) => sum + word.durationMs, 0);
    const speakingRateWpm =
      totalDurationMs > 0 ? validWords.length / (totalDurationMs / 60_000) : 0;

    return {
      pronScore: pronunciationResult.pronScore,
      accuracyScore: pronunciationResult.accuracyScore,
      fluencyScore: pronunciationResult.fluencyScore,
      completenessScore: pronunciationResult.completenessScore,
      prosodyScore: pronunciationResult.prosodyScore,
      speakingRateWpm,
      pronWords: toInputJson(taggedWords),
      pronRawJson: toInputJson(pronunciationResult.rawUtterances),
    };
  } catch (error) {
    logger.warn(
      {
        sessionId,
        chunkIndex,
        err: error instanceof Error ? error : new Error('Unknown error'),
      },
      'Chunk pronunciation assessment failed',
    );
    return nullPronScores;
  }
}

// ---------------------------------------------------------------------------
// Audio cleanup
// ---------------------------------------------------------------------------

async function cleanupChunkAudio(
  sessionId: string,
  chunkIndex: number,
  chunkId: string,
  audioKey: string,
): Promise<void> {
  try {
    await deleteAudio(audioKey);
    await prisma.sessionChunk.update({
      where: { id: chunkId },
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
}

// ---------------------------------------------------------------------------
// Fan-in gate
// ---------------------------------------------------------------------------

/** Checks whether all chunks for a session are done and, if so, atomically enqueues the final fan-in job exactly once. */
export async function maybeEnqueueFinalProcessing(sessionId: string): Promise<void> {
  const session = await prisma.speakingSession.findUnique({
    where: { id: sessionId },
    select: { chunkCount: true, isChunked: true, status: true },
  });

  if (!session?.isChunked || session.chunkCount == null) return;

  const doneCount = await prisma.sessionChunk.count({
    where: { sessionId, status: ChunkStatus.CHUNK_DONE },
  });

  if (doneCount !== session.chunkCount) return;

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

  if (result.count === 0) return;

  await enqueueFinalProcessing(sessionId);
}

// ---------------------------------------------------------------------------
// Main chunk processor
// ---------------------------------------------------------------------------

/** Transcribes and pronunciation-scores a single audio chunk, persists results, deletes chunk audio from R2, and triggers final fan-in when all chunks are complete. */
export async function processChunk(
  sessionId: string,
  chunkIndex: number,
): Promise<void> {
  const chunkStart = Date.now();
  const chunk = await prisma.sessionChunk.findUnique({
    where: { sessionId_chunkIndex: { sessionId, chunkIndex } },
    include: {
      session: { select: { id: true, userId: true, status: true, isChunked: true } },
    },
  });

  if (!chunk) throw new Error(`Chunk not found: ${sessionId}/${chunkIndex}`);

  const audioKey = chunk.audioUrl;
  if (!audioKey) throw new Error(`Chunk missing audio URL: ${sessionId}/${chunkIndex}`);

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
    data: { status: ChunkStatus.SCORING, transcriptText, words: toInputJson(words), wordCount },
  });

  const pronScores = await scoreChunkPronunciation(sessionId, chunkIndex, audioBuffer, transcriptText);

  await prisma.sessionChunk.update({
    where: { id: chunk.id },
    data: { status: ChunkStatus.CHUNK_DONE, ...pronScores },
  });

  try {
    await extractChunkFeatures({
      sessionId,
      chunkIndex,
      audioKey,
      durationSecs: chunk.durationSecs,
      overlapSecs: chunk.overlapSecs,
    });
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

  await cleanupChunkAudio(sessionId, chunkIndex, chunk.id, audioKey);

  logPipelineStage({
    sessionId,
    stage: 'processChunk',
    durationMs: Date.now() - chunkStart,
    success: true,
    metadata: { chunkIndex },
  });

  await maybeEnqueueFinalProcessing(sessionId);
}
