// Authenticated endpoint — cancels a session, deletes R2 audio and chunk records
import type pino from 'pino';
import { auth } from '@/features/auth/auth';
import { errorResponse, successResponse } from '@/lib/api';
import { validateOrigin, csrfForbiddenResponse } from '@/lib/csrf';
import { findOrCreateUser } from '@/lib/db-utils';
import { withObservability } from '@/lib/observability';
import { prisma } from '@/lib/prisma';
import { deleteAudio } from '@/lib/storage/r2';
import { SessionStatus } from '@prisma/client';
import { z } from 'zod';

const bodySchema = z.object({
  sessionId: z.string(),
});

async function handler(req: Request, { logger }: { logger: pino.Logger; requestId: string }) {
  try {
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

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return errorResponse('Invalid request body', 'VALIDATION_ERROR', 400);
    }

    const { sessionId } = parsed.data;

    const speakingSession = await prisma.speakingSession.findFirst({
      where: { id: sessionId, userId: user.id },
      select: { id: true, status: true, audioUrl: true },
    });

    if (!speakingSession) {
      return errorResponse('Session not found', 'NOT_FOUND', 404);
    }

    if (
      speakingSession.status === SessionStatus.DONE ||
      speakingSession.status === SessionStatus.FAILED
    ) {
      return errorResponse('Session already completed', 'CONFLICT', 409);
    }

    if (speakingSession.audioUrl) {
      try {
        await deleteAudio(speakingSession.audioUrl);
      } catch (err) {
        logger.warn({ sessionId, err }, 'Failed to delete session audio during cancel');
      }
    }

    const chunks = await prisma.sessionChunk.findMany({
      where: { sessionId },
      select: { audioUrl: true },
    });

    await Promise.allSettled(
      chunks
        .filter((chunk): chunk is { audioUrl: string } => chunk.audioUrl !== null)
        .map((chunk) => deleteAudio(chunk.audioUrl)),
    );

    await prisma.chunkResult.deleteMany({ where: { sessionId } });
    await prisma.sessionChunk.deleteMany({ where: { sessionId } });

    await prisma.speakingSession.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.CANCELLED,
        errorMessage: 'Cancelled by user',
      },
    });

    logger.info({ sessionId, userId: user.id }, 'Session cancelled by user');

    return successResponse({ ok: true, sessionId });
  } catch {
    return errorResponse('Failed to cancel session', 'INTERNAL_ERROR', 500);
  }
}

export const POST = withObservability(handler, { route: 'internal/cancel-session' });
