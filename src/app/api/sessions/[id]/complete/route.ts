// Marks a chunked session complete and sets expected chunk count for fan-in
import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/prisma';
import { findOrCreateUser } from '@/lib/db-utils';
import { errorResponse, successResponse } from '@/lib/api';
import { validateOrigin, csrfForbiddenResponse } from '@/lib/csrf';
import { withObservability } from '@/lib/observability';
import type pino from 'pino';
import { SessionStatus } from '@prisma/client';
import { z } from 'zod';
import { isAlreadyFinalized, handleParallelChunks, handleSequentialChunks } from './completeHelpers';

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

  if (isAlreadyFinalized(speakingSession.status)) {
    return successResponse({ sessionId, chunkCount, status: 'already_finalized' });
  }

  await prisma.speakingSession.update({
    where: { id: sessionId },
    data: {
      chunkCount,
      durationSecs,
      status: SessionStatus.CHUNKS_PROCESSING,
    },
  });

  const parallelChunkCount = await prisma.chunkResult.count({ where: { sessionId } });

  if (parallelChunkCount > 0) {
    return handleParallelChunks({ sessionId, chunkCount });
  }

  return handleSequentialChunks({ sessionId, chunkCount });
}

export const POST = (req: Request, routeCtx: { params: Promise<{ id: string }> }) =>
  withObservability(
    (r, obsCtx) => postHandler(r, obsCtx, routeCtx),
    { route: 'sessions/[id]/complete', getSession: auth },
  )(req);
