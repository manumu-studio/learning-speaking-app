// API route: Get drill attempt details (including feedback if completed)

import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/prisma';
import { findOrCreateUser } from '@/lib/db-utils';
import { errorResponse, successResponse } from '@/lib/api';
import { withObservability } from '@/lib/observability';

async function handler(req: Request) {
  const authSession = await auth();
  if (!authSession?.user?.externalId) {
    return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
  }

  const user = await findOrCreateUser(authSession.user.externalId, {
    email: authSession.user.email ?? undefined,
    displayName: authSession.user.name ?? undefined,
  });

  // Extract drill id from URL path: /api/drills/[id]
  const id = new URL(req.url).pathname.split('/').at(-1) ?? '';

  const drill = await prisma.drillAttempt.findUnique({
    where: { id },
  });

  if (!drill || drill.userId !== user.id) {
    return errorResponse('Not found', 'NOT_FOUND', 404);
  }

  return successResponse({
    id: drill.id,
    sessionId: drill.sessionId,
    drillType: drill.drillType,
    metricKey: drill.metricKey,
    prompt: drill.prompt,
    sourceExample: drill.sourceExample,
    transcript: drill.transcript,
    feedback: drill.feedback,
    improved: drill.improved,
    createdAt: drill.createdAt,
    completedAt: drill.completedAt,
  }, 200, {
    'Cache-Control': 'private, max-age=60, stale-while-revalidate=120',
  });
}

export const GET = withObservability(handler, { route: 'drills/[id]' });
