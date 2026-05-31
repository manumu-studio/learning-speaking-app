// Session detail (GET) and deletion (DELETE) API
import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/prisma';
import { deleteAudio } from '@/lib/storage/r2';
import { successResponse, errorResponse } from '@/lib/api';
import { withObservability } from '@/lib/observability';
import type pino from 'pino';
import { validateOrigin, csrfForbiddenResponse } from '@/lib/csrf';

/**
 * GET /api/sessions/:id
 * Fetch session details with transcript and insights
 */
async function getHandler(
  _req: Request,
  { logger }: { logger: pino.Logger; requestId: string },
  routeCtx: { params: Promise<{ id: string }> },
) {
  const { id } = await routeCtx.params;

  const session = await auth();
  if (!session?.user?.externalId) {
    return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
  }

  const user = await prisma.user.findUnique({
    where: { externalId: session.user.externalId },
  });

  if (!user) {
    return errorResponse('User not found', 'USER_NOT_FOUND', 404);
  }

  const speakingSession = await prisma.speakingSession.findFirst({
    where: { id, userId: user.id },
    include: {
      transcript: true,
      insights: { orderBy: { severity: 'desc' } },
      metrics: { orderBy: { key: 'asc' } },
      pronunciationReport: {
        select: {
          pronScore: true,
          accuracyScore: true,
          fluencyScore: true,
          completenessScore: true,
          prosodyScore: true,
          speakingRateWpm: true,
          failureReason: true,
          words: {
            select: {
              word: true,
              display: true,
              accuracyScore: true,
              errorType: true,
              offsetMs: true,
              durationMs: true,
              phonemes: true,
              l1Tags: true,
              breakErrorTypes: true,
              intonationErrorTypes: true,
              monotonePitchDelta: true,
            },
            orderBy: { wordIndex: 'asc' },
          },
        },
      },
      chunks: {
        orderBy: { chunkIndex: 'asc' },
        select: {
          chunkIndex: true,
          durationSecs: true,
          transcriptText: true,
          wordCount: true,
          accuracyScore: true,
          fluencyScore: true,
          prosodyScore: true,
          pronScore: true,
          status: true,
        },
      },
    },
  });

  if (!speakingSession) {
    return errorResponse('Session not found', 'SESSION_NOT_FOUND', 404);
  }

  const workoutNumber = await prisma.speakingSession.count({
    where: {
      userId: user.id,
      status: 'DONE',
      createdAt: { lte: speakingSession.createdAt },
    },
  });

  logger.info({ sessionId: id }, 'Session fetched');

  return successResponse({ ...speakingSession, workoutNumber }, 200, {
    'Cache-Control': 'private, max-age=60, stale-while-revalidate=120',
  });
}

export const GET = (req: Request, routeCtx: { params: Promise<{ id: string }> }) =>
  withObservability(
    (r, obsCtx) => getHandler(r, obsCtx, routeCtx),
    { route: 'sessions/[id]' },
  )(req);

/**
 * DELETE /api/sessions/:id
 * Delete session, R2 audio, and cascaded data
 */
async function deleteHandler(
  req: Request,
  { logger }: { logger: pino.Logger; requestId: string },
  routeCtx: { params: Promise<{ id: string }> },
) {
  const { id } = await routeCtx.params;

  const session = await auth();
  if (!session?.user?.externalId) {
    return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
  }

  if (!validateOrigin(req)) {
    return csrfForbiddenResponse();
  }

  const user = await prisma.user.findUnique({
    where: { externalId: session.user.externalId },
  });

  if (!user) {
    return errorResponse('User not found', 'USER_NOT_FOUND', 404);
  }

  const speakingSession = await prisma.speakingSession.findFirst({
    where: { id, userId: user.id },
  });

  if (!speakingSession) {
    return errorResponse('Session not found', 'SESSION_NOT_FOUND', 404);
  }

  // Best-effort R2 cleanup: session-level audio + per-chunk audio
  const chunks = await prisma.sessionChunk.findMany({
    where: { sessionId: id },
    select: { audioUrl: true },
  });

  const audioKeys: string[] = [];
  if (speakingSession.audioUrl && !speakingSession.audioDeletedAt) {
    audioKeys.push(speakingSession.audioUrl);
  }
  for (const chunk of chunks) {
    if (chunk.audioUrl) {
      audioKeys.push(chunk.audioUrl);
    }
  }

  for (const key of audioKeys) {
    try {
      await deleteAudio(key);
    } catch (r2Error) {
      logger.warn(
        { err: r2Error instanceof Error ? r2Error : new Error('Unknown error') },
        'Failed to delete audio from R2',
      );
    }
  }

  // Delete session (cascades to related records via Prisma onDelete: Cascade)
  await prisma.speakingSession.delete({ where: { id } });

  logger.info({ sessionId: id }, 'Session deleted');

  return new Response(null, { status: 204 });
}

export const DELETE = (req: Request, routeCtx: { params: Promise<{ id: string }> }) =>
  withObservability(
    (r, obsCtx) => deleteHandler(r, obsCtx, routeCtx),
    { route: 'sessions/[id]' },
  )(req);
