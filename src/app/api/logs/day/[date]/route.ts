// API route: returns evidence bundle for all sessions on a date
import { z } from 'zod';
import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/api';
import { withObservability } from '@/lib/observability';
import { buildDayEvidence } from '@/lib/evidence';
import type { ObservabilityContext } from '@/lib/observability';

const DateParamSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD');

async function handler(
  _req: Request,
  _obsCtx: ObservabilityContext,
  routeCtx: { params: Promise<{ date: string }> },
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

  const { date: rawDate } = await routeCtx.params;
  const parsed = DateParamSchema.safeParse(rawDate);
  if (!parsed.success) {
    return errorResponse(
      'date param must be YYYY-MM-DD',
      'VALIDATION_ERROR',
      400,
    );
  }

  const bundle = await buildDayEvidence(user.id, parsed.data);
  return successResponse(bundle);
}

export const GET = (
  req: Request,
  routeCtx: { params: Promise<{ date: string }> },
) =>
  withObservability(
    (r, obsCtx) => handler(r, obsCtx, routeCtx),
    { route: 'logs/day/[date]', getSession: auth },
  )(req);
