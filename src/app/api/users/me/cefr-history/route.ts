// CEFR history API — returns longitudinal CEFR estimates derived from MetricSnapshot data
import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/prisma';
import { errorResponse, successResponse } from '@/lib/api';
import { withObservability } from '@/lib/observability';
import { findOrCreateUser } from '@/lib/db-utils';
import { estimateCefr } from '@/lib/cefr/estimateCefr';
import { isSpeakingMetricKey } from '@/lib/metric-keys';

async function getHandler() {
  const session = await auth();
  if (!session?.user?.externalId) {
    return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
  }

  const user = await findOrCreateUser(session.user.externalId, {
    email: session.user.email ?? undefined,
    displayName: session.user.name ?? undefined,
  });

  const sessions = await prisma.speakingSession.findMany({
    where: { userId: user.id, status: 'DONE' },
    orderBy: { createdAt: 'asc' },
    select: { id: true, createdAt: true },
  });

  const sessionIds = sessions.map((s) => s.id);
  const allMetrics = await prisma.metricSnapshot.findMany({
    where: { sessionId: { in: sessionIds } },
    select: { sessionId: true, key: true, score: true },
  });

  const metricsBySession = new Map<string, Array<{ key: string; score: number }>>();
  for (const m of allMetrics) {
    const list = metricsBySession.get(m.sessionId) ?? [];
    list.push({ key: m.key, score: m.score });
    metricsBySession.set(m.sessionId, list);
  }

  const history = sessions
    .map((s) => {
      const metrics = metricsBySession.get(s.id) ?? [];
      const cefrInput = metrics.flatMap((m) =>
        isSpeakingMetricKey(m.key) ? [{ key: m.key, score: m.score }] : [],
      );
      const estimate = estimateCefr(cefrInput);
      if (!estimate) return null;
      return {
        sessionId: s.id,
        date: s.createdAt.toISOString(),
        level: estimate.level,
        weightedAverage: estimate.weightedAverage,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  return successResponse({ history });
}

export const GET = withObservability(getHandler);
