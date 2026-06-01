// API route: submit an SRS review rating for a vocabulary item

import { z } from 'zod';
import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/prisma';
import { findOrCreateUser } from '@/lib/db-utils';
import { errorResponse, successResponse } from '@/lib/api';
import { withObservability } from '@/lib/observability';
import { computeNextReview } from '@/lib/srs/sm2';
import { RATING_LABEL_MAP } from '@/lib/srs/sm2.types';
import type pino from 'pino';

const ReviewBodySchema = z.object({
  rating: z.enum(['again', 'hard', 'good', 'easy']),
});

async function postHandler(
  req: Request,
  { logger: _logger }: { logger: pino.Logger; requestId: string },
  routeCtx: { params: Promise<{ id: string }> },
) {
  const authSession = await auth();
  if (!authSession?.user?.externalId) {
    return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
  }

  const user = await findOrCreateUser(authSession.user.externalId, {
    email: authSession.user.email ?? undefined,
    displayName: authSession.user.name ?? undefined,
  });

  const body: unknown = await req.json();
  const parsed = ReviewBodySchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('Invalid rating', 'VALIDATION_ERROR', 400);
  }

  const { id } = await routeCtx.params;

  const item = await prisma.vocabSuggestion.findFirst({
    where: { id, userId: user.id },
  });

  if (item === null) {
    return errorResponse('Vocabulary item not found', 'NOT_FOUND', 404);
  }

  const numericRating = RATING_LABEL_MAP[parsed.data.rating];
  const now = new Date();

  const result = computeNextReview(
    { interval: item.interval, easeFactor: item.easeFactor, reviewCount: item.reviewCount },
    numericRating,
    now,
  );

  const updated = await prisma.vocabSuggestion.update({
    where: { id: item.id },
    data: {
      interval: result.nextInterval,
      easeFactor: result.nextEaseFactor,
      nextReviewAt: result.nextReviewAt,
      reviewCount: item.reviewCount + 1,
      lastReviewedAt: now,
    },
  });

  return successResponse({
    id: updated.id,
    nextReviewAt: updated.nextReviewAt?.toISOString() ?? null,
    interval: updated.interval,
    easeFactor: updated.easeFactor,
    reviewCount: updated.reviewCount,
  });
}

export const POST = (req: Request, routeCtx: { params: Promise<{ id: string }> }) =>
  withObservability(
    (r, obsCtx) => postHandler(r, obsCtx, routeCtx),
    { route: 'users/me/vocabulary/[id]/review' },
  )(req);
