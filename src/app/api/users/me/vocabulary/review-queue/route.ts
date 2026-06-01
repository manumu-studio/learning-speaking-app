// API route: get vocabulary items due for SRS review

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

  const items = await prisma.vocabSuggestion.findMany({
    where: { userId: user.id, nextReviewAt: { lte: now } },
    orderBy: { nextReviewAt: 'asc' },
    take: 20,
  });

  const serialized = items.map((item) => ({
    id: item.id,
    word: item.word,
    meaning: item.meaning,
    exampleSentence: item.exampleSentence,
    type: item.type,
    domain: item.domain,
    frequencyBand: item.frequencyBand,
    interval: item.interval,
    reviewCount: item.reviewCount,
    nextReviewAt: item.nextReviewAt?.toISOString() ?? null,
    lastReviewedAt: item.lastReviewedAt?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
  }));

  return successResponse(serialized);
}

export const GET = withObservability(getHandler, { route: 'users/me/vocabulary/review-queue' });
