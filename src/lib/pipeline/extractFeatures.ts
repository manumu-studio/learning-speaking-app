// Stub chunk feature extraction — placeholder F0/intensity data until parselmouth in PACKET-44B
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function extractChunkFeatures(
  _audioBuffer: Buffer,
  sessionId: string,
  chunkIndex: number,
  durationSecs: number,
): Promise<void> {
  const endMs = Math.round(durationSecs * 1000);

  await prisma.chunkFeature.upsert({
    where: {
      sessionId_chunkIndex: { sessionId, chunkIndex },
    },
    create: {
      sessionId,
      chunkIndex,
      startMs: 0,
      endMs,
      frameMs: 10,
      f0Hz: [],
      intensityDb: [],
      voiced: [],
    },
    update: {
      startMs: 0,
      endMs,
      f0Hz: [],
      intensityDb: [],
      voiced: [],
    },
  });

  logger.debug({ sessionId, chunkIndex, endMs }, 'Chunk features stub persisted');
}
