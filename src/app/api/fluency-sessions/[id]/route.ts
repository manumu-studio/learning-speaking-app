// GET detail for a single 4-3-2 timed fluency session
import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/prisma';
import { errorResponse, successResponse } from '@/lib/api';
import { withObservability } from '@/lib/observability';
import { findPromptById } from '@/lib/prompts/promptLibrary';
import type pino from 'pino';

async function getHandler(
  _req: Request,
  { logger }: { logger: pino.Logger; requestId: string },
  routeCtx: { params: Promise<{ id: string }> },
) {
  const { id } = await routeCtx.params;

  const authSession = await auth();
  if (!authSession?.user?.externalId) {
    return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
  }

  const user = await prisma.user.findUnique({
    where: { externalId: authSession.user.externalId },
  });

  if (!user) {
    return errorResponse('Session not found', 'SESSION_NOT_FOUND', 404);
  }

  const session = await prisma.timedFluencySession.findFirst({
    where: { id, userId: user.id },
    include: {
      rounds: {
        orderBy: { roundNumber: 'asc' },
        select: {
          id: true,
          roundNumber: true,
          targetMinutes: true,
          speakingSessionId: true,
          speechRateWpm: true,
          fillerCount: true,
          hesitationCount: true,
          completedAt: true,
          createdAt: true,
        },
      },
    },
  });

  if (!session) {
    return errorResponse('Session not found', 'SESSION_NOT_FOUND', 404);
  }

  const prompt = findPromptById(session.promptId);

  logger.info({ fluencySessionId: id }, 'Fluency session detail fetched');

  return successResponse({
    id: session.id,
    promptId: session.promptId,
    promptTitle: prompt?.title ?? null,
    promptText: prompt?.text ?? null,
    status: session.status,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    rounds: session.rounds.map((r) => ({
      id: r.id,
      roundNumber: r.roundNumber,
      targetMinutes: r.targetMinutes,
      speakingSessionId: r.speakingSessionId,
      speechRateWpm: r.speechRateWpm,
      fillerCount: r.fillerCount,
      hesitationCount: r.hesitationCount,
      completedAt: r.completedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}

export const GET = (req: Request, routeCtx: { params: Promise<{ id: string }> }) =>
  withObservability(
    (r, obsCtx) => getHandler(r, obsCtx, routeCtx),
    { route: 'fluency-sessions/[id]' },
  )(req);
