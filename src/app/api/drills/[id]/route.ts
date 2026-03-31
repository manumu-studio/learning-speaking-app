// API route: Get drill attempt details (including feedback if completed)

import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/prisma';
import { findOrCreateUser } from '@/lib/db-utils';
import { errorResponse, successResponse } from '@/lib/api';
import { log } from '@/lib/logger';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authSession = await auth();
    if (!authSession?.user?.externalId) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const user = await findOrCreateUser(authSession.user.externalId, {
      email: authSession.user.email ?? undefined,
      displayName: authSession.user.name ?? undefined,
    });

    const { id } = await params;

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
    });
  } catch (error) {
    log({
      level: 'error',
      message: 'Drill fetch failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return errorResponse('Failed to fetch drill', 'INTERNAL_ERROR', 500);
  }
}
