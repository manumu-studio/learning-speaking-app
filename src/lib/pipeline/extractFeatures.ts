// Persists per-chunk F0/intensity features via the Praat microservice at chunk processing time
/* eslint-disable max-params */
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { extractContour } from '@/lib/praat';
import { computeChunkTimeRange } from '@/lib/pipeline/chunkTiming';
import { generatePresignedGetUrl } from '@/lib/storage/r2';

/** Extracts F0/intensity contour for a single chunk via the Praat microservice and persists it as a ChunkFeature row. */
export async function extractChunkFeatures(
  sessionId: string,
  chunkIndex: number,
  audioKey: string,
  durationSecs: number,
  overlapSecs: number,
): Promise<void> {
  if (env.PRAAT_SERVICE_URL === undefined || env.PRAAT_API_KEY === undefined) {
    return;
  }

  const sessionChunks = await prisma.sessionChunk.findMany({
    where: { sessionId },
    orderBy: { chunkIndex: 'asc' },
    select: { durationSecs: true, overlapSecs: true },
  });

  const timingInputs =
    sessionChunks.length > 0
      ? sessionChunks
      : [{ durationSecs, overlapSecs }];

  const { startMs, endMs } = computeChunkTimeRange(chunkIndex, timingInputs);
  const presignedUrl = await generatePresignedGetUrl(audioKey);
  const contour = await extractContour(presignedUrl, durationSecs);

  if (contour === null) {
    logger.warn({ sessionId, chunkIndex }, 'Skipping ChunkFeature persist — no contour data');
    return;
  }

  await prisma.chunkFeature.upsert({
    where: {
      sessionId_chunkIndex: { sessionId, chunkIndex },
    },
    create: {
      sessionId,
      chunkIndex,
      startMs,
      endMs,
      frameMs: contour.frameMs,
      f0Hz: contour.f0Hz,
      intensityDb: contour.intensityDb,
      voiced: contour.voiced,
    },
    update: {
      startMs,
      endMs,
      frameMs: contour.frameMs,
      f0Hz: contour.f0Hz,
      intensityDb: contour.intensityDb,
      voiced: contour.voiced,
    },
  });
}
