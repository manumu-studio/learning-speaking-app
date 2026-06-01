// API route: vocabulary statistics — totals, adoption rate, domain/type/frequency breakdown

import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/prisma';
import { findOrCreateUser } from '@/lib/db-utils';
import { errorResponse, successResponse } from '@/lib/api';
import { withObservability } from '@/lib/observability';
import type pino from 'pino';

async function getHandler(_req: Request, { logger: _logger }: { logger: pino.Logger; requestId: string }) {
  const authSession = await auth();
  if (!authSession?.user?.externalId) {
    return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
  }

  const user = await findOrCreateUser(authSession.user.externalId, {
    email: authSession.user.email ?? undefined,
    displayName: authSession.user.name ?? undefined,
  });

  const now = new Date();

  const [totalItems, dueCount, adoptedCount, domainGroups, typeGroups, frequencyGroups, avgResult] =
    await Promise.all([
      prisma.vocabSuggestion.count({ where: { userId: user.id } }),
      prisma.vocabSuggestion.count({ where: { userId: user.id, nextReviewAt: { lte: now } } }),
      prisma.vocabSuggestion.count({ where: { userId: user.id, firstUsedAt: { not: null } } }),
      prisma.vocabSuggestion.groupBy({
        by: ['domain'],
        where: { userId: user.id },
        _count: { id: true },
      }),
      prisma.vocabSuggestion.groupBy({
        by: ['type'],
        where: { userId: user.id },
        _count: { id: true },
      }),
      prisma.vocabSuggestion.groupBy({
        by: ['frequencyBand'],
        where: { userId: user.id },
        _count: { id: true },
      }),
      prisma.vocabSuggestion.aggregate({
        where: { userId: user.id, reviewCount: { gt: 0 } },
        _avg: { interval: true },
      }),
    ]);

  return successResponse({
    totalItems,
    dueCount,
    adoptedCount,
    adoptionRate: totalItems > 0 ? adoptedCount / totalItems : 0,
    averageInterval: avgResult._avg.interval ?? 0,
    domainBreakdown: domainGroups.map((g) => ({ domain: g.domain, count: g._count.id })),
    typeBreakdown: typeGroups.map((g) => ({ type: g.type, count: g._count.id })),
    frequencyBreakdown: frequencyGroups.map((g) => ({ band: g.frequencyBand, count: g._count.id })),
  });
}

export const GET = withObservability(getHandler, { route: 'users/me/vocabulary/stats' });
