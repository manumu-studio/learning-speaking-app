// API route: returns evidence bundle for a single session
import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/api';
import { withObservability } from '@/lib/observability';
import { buildSessionEvidence } from '@/lib/evidence';
import type { ObservabilityContext } from '@/lib/observability';

async function handler(
  _req: Request,
  _obsCtx: ObservabilityContext,
  routeCtx: { params: Promise<{ id: string }> },
) {
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

  const { id } = await routeCtx.params;

  const speakingSession = await prisma.speakingSession.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!speakingSession || speakingSession.userId !== user.id) {
    return errorResponse('Session not found', 'NOT_FOUND', 404);
  }

  const bundle = await buildSessionEvidence(id);
  return successResponse(bundle);
}

export const GET = (
  req: Request,
  routeCtx: { params: Promise<{ id: string }> },
) =>
  withObservability(
    (r, obsCtx) => handler(r, obsCtx, routeCtx),
    { route: 'logs/session/[id]' },
  )(req);
