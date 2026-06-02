// POST /api/naturalness/:flagId/feedback — records user feedback on a naturalness flag
import { z } from 'zod';
import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/api';
import { withObservability } from '@/lib/observability';
import { validateOrigin, csrfForbiddenResponse } from '@/lib/csrf';
import type pino from 'pino';

const feedbackBodySchema = z.object({
  feedback: z.enum(['helpful', 'false_positive']),
});

async function postHandler(
  req: Request,
  { logger }: { logger: pino.Logger; requestId: string },
  routeCtx: { params: Promise<{ flagId: string }> },
) {
  const { flagId } = await routeCtx.params;

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

  const flag = await prisma.naturalnessFlag.findFirst({
    where: { id: flagId, userId: user.id },
  });

  if (!flag) {
    return errorResponse('Flag not found', 'FLAG_NOT_FOUND', 404);
  }

  const body: unknown = await req.json();
  const parsed = feedbackBodySchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('Invalid feedback value', 'INVALID_FEEDBACK', 400);
  }

  await prisma.naturalnessFlag.update({
    where: { id: flagId },
    data: { userFeedback: parsed.data.feedback },
  });

  logger.info({ flagId, feedback: parsed.data.feedback }, 'Naturalness feedback recorded');

  return successResponse({ ok: true });
}

export const POST = (req: Request, routeCtx: { params: Promise<{ flagId: string }> }) =>
  withObservability(
    (r, obsCtx) => postHandler(r, obsCtx, routeCtx),
    { route: 'naturalness/[flagId]/feedback' },
  )(req);
