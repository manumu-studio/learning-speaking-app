// Helpers for POST /api/sessions/[id]/complete — chunk finalization logic
import { prisma } from '@/lib/prisma';
import { successResponse } from '@/lib/api';
import { ChunkStatus, SessionStatus } from '@prisma/client';
import { maybeEnqueueFinalProcessing } from '@/lib/pipeline/processChunk';
import { enqueueFinalProcessing } from '@/lib/queue/qstash';

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

/** Returns true when the session is already in a terminal state. */
export function isAlreadyFinalized(status: SessionStatus): boolean {
  return status === SessionStatus.DONE || status === SessionStatus.FAILED;
}

// ---------------------------------------------------------------------------
// Branching paths for chunk-count scenarios
// ---------------------------------------------------------------------------

type ChunkResult = {
  sessionId: string;
  chunkCount: number;
};

/**
 * Handle the case where at least one ChunkResult has already arrived in parallel.
 * Sets AWAITING_FINAL → claims PROCESSING_FINAL → enqueues final processing.
 */
export async function handleParallelChunks({ sessionId, chunkCount }: ChunkResult): Promise<Response> {
  await prisma.speakingSession.update({
    where: { id: sessionId },
    data: { status: SessionStatus.AWAITING_FINAL },
  });

  const claimed = await prisma.speakingSession.updateMany({
    where: { id: sessionId, status: SessionStatus.AWAITING_FINAL },
    data: { status: SessionStatus.PROCESSING_FINAL },
  });

  if (claimed.count > 0) {
    await enqueueFinalProcessing(sessionId);
  }

  return successResponse({
    sessionId,
    chunkCount,
    status: 'finalizing',
    estimatedWaitSecs: 20,
  });
}

/**
 * Handle the case where no ChunkResult has arrived yet (sequential / normal path).
 * Enqueues final processing if all expected chunks are done.
 */
export async function handleSequentialChunks({ sessionId, chunkCount }: ChunkResult): Promise<Response> {
  const doneCount = await prisma.sessionChunk.count({
    where: { sessionId, status: ChunkStatus.CHUNK_DONE },
  });

  if (doneCount === chunkCount) {
    await maybeEnqueueFinalProcessing(sessionId);
  }

  return successResponse({
    sessionId,
    chunkCount,
    status: doneCount === chunkCount ? 'finalizing' : 'processing',
    estimatedWaitSecs: 30,
  });
}
