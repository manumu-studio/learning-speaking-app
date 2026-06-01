// API route: list user's vocabulary suggestions with adoption status

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

  const suggestions = await prisma.vocabSuggestion.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const serialized = suggestions.map((s) => ({
    id: s.id,
    word: s.word,
    meaning: s.meaning,
    exampleSentence: s.exampleSentence,
    type: s.type,
    domain: s.domain,
    frequencyBand: s.frequencyBand,
    suggestedInSessionId: s.suggestedInSessionId,
    firstUsedInSessionId: s.firstUsedInSessionId,
    firstUsedAt: s.firstUsedAt?.toISOString() ?? null,
    nextReviewAt: s.nextReviewAt?.toISOString() ?? null,
    interval: s.interval,
    reviewCount: s.reviewCount,
    createdAt: s.createdAt.toISOString(),
  }));

  return successResponse(serialized);
}

export const GET = withObservability(getHandler, { route: 'users/me/vocabulary' });
