// Marks a chunked session complete and sets expected chunk count for fan-in
import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/prisma';
import { findOrCreateUser } from '@/lib/db-utils';
import { errorResponse, successResponse } from '@/lib/api';
import { validateOrigin, csrfForbiddenResponse } from '@/lib/csrf';
import { withObservability } from '@/lib/observability';
import type pino from 'pino';
import { ChunkStatus, SessionStatus } from '@prisma/client';
import { maybeEnqueueFinalProcessing } from '@/lib/pipeline/processChunk';
import { enqueueFinalProcessing } from '@/lib/queue/qstash';
import { z } from 'zod';

const completeBodySchema = z.object({
  chunkCount: z.number().int().min(1),
  durationSecs: z.number().int().min(1),
});

async function postHandler(
  req: Request,
  { logger: _logger }: { logger: pino.Logger; requestId: string },
  routeCtx: { params: Promise<{ id: string }> },
) {
  const { id: sessionId } = await routeCtx.params;

  const session = await auth();
  if (!session?.user?.externalId) {
    return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
  }

  if (!validateOrigin(req)) {
    return csrfForbiddenResponse();
  }

  const user = await findOrCreateUser(session.user.externalId, {
    email: session.user.email ?? undefined,
    displayName: session.user.name ?? undefined,
  });

  const speakingSession = await prisma.speakingSession.findFirst({
    where: { id: sessionId, userId: user.id, isChunked: true },
  });

  if (!speakingSession) {
    return errorResponse('Chunked session not found', 'NOT_FOUND', 404);
  }

  const parsed = completeBodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return errorResponse('Invalid request body', 'VALIDATION_ERROR', 400);
  }

  const { chunkCount, durationSecs } = parsed.data;

  if (durationSecs < 45) {
    return errorResponse('Recording must be at least 45 seconds', 'VALIDATION_ERROR', 400);
  }

  if (
    speakingSession.status === SessionStatus.DONE ||
    speakingSession.status === SessionStatus.FAILED
  ) {
    return successResponse({ sessionId, chunkCount, status: 'already_finalized' });
  }

  const parallelChunkCount = await prisma.chunkResult.count({
    where: { sessionId },
  });

  await prisma.speakingSession.update({
    where: { id: sessionId },
    data: {
      chunkCount,
      durationSecs,
      status: SessionStatus.CHUNKS_PROCESSING,
    },
  });

  if (parallelChunkCount > 0) {
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

export const POST = (req: Request, routeCtx: { params: Promise<{ id: string }> }) =>
  withObservability(
    (r, obsCtx) => postHandler(r, obsCtx, routeCtx),
    { route: 'sessions/[id]/complete' },
  )(req);
