// API route for fetching focus metric comparison with previous session
import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/api';
import { isSpeakingMetricKey } from '@/lib/metric-keys';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const metricKey = url.searchParams.get('metricKey');

    if (!metricKey || !isSpeakingMetricKey(metricKey)) {
      return errorResponse('Missing or invalid metricKey parameter', 'BAD_REQUEST', 400);
    }

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

    const currentSession = await prisma.speakingSession.findFirst({
      where: { id, userId: user.id },
      select: {
        id: true,
        userId: true,
        focusMetricKey: true,
        createdAt: true,
      },
    });

    if (!currentSession) {
      return errorResponse('Session not found', 'SESSION_NOT_FOUND', 404);
    }

    if (
      currentSession.focusMetricKey === null ||
      currentSession.focusMetricKey !== metricKey
    ) {
      return errorResponse('Focus comparison not available for this session', 'FORBIDDEN', 403);
    }

    const currentMetric = await prisma.metricSnapshot.findFirst({
      where: {
        sessionId: id,
        key: metricKey,
      },
    });

    if (!currentMetric) {
      return errorResponse('Metric not found for current session', 'METRIC_NOT_FOUND', 404);
    }

    const previousSession = await prisma.speakingSession.findFirst({
      where: {
        userId: user.id,
        id: { not: id },
        focusMetricKey: metricKey,
        status: 'DONE',
        createdAt: { lt: currentSession.createdAt },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    let previousScore: number | null = null;

    if (previousSession) {
      const previousMetric = await prisma.metricSnapshot.findFirst({
        where: {
          sessionId: previousSession.id,
          key: metricKey,
        },
      });
      previousScore = previousMetric?.score ?? null;
    }

    return successResponse({
      currentScore: currentMetric.score,
      previousScore,
    });
  } catch {
    return errorResponse('Failed to fetch focus comparison', 'INTERNAL_ERROR', 500);
  }
}
