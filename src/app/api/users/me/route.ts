// User self-management API — PATCH sets onboardedAt to mark onboarding complete
import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/prisma';
import { errorResponse, successResponse } from '@/lib/api';
import { validateOrigin, csrfForbiddenResponse } from '@/lib/csrf';
import { withObservability } from '@/lib/observability';
import { z } from 'zod';

const PatchUserMeSchema = z.object({
  onboardedAt: z.string().datetime({ message: 'onboardedAt must be an ISO 8601 datetime string' }),
});

/**
 * PATCH /api/users/me
 * Mark the authenticated user as having completed onboarding.
 */
async function patchHandler(request: Request) {
  const session = await auth();
  if (!session?.user?.externalId) {
    return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
  }

  if (!validateOrigin(request)) {
    return csrfForbiddenResponse();
  }

  const body: unknown = await request.json();
  const parsed = PatchUserMeSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Invalid request body';
    return errorResponse(firstError, 'VALIDATION_ERROR', 400);
  }

  const user = await prisma.user.findUnique({
    where: { externalId: session.user.externalId },
  });

  if (!user) {
    return errorResponse('User not found', 'NOT_FOUND', 404);
  }

  if (user.onboardedAt !== null) {
    return successResponse({ onboardedAt: user.onboardedAt.toISOString() });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { onboardedAt: new Date(parsed.data.onboardedAt) },
    select: { onboardedAt: true },
  });

  return successResponse({
    onboardedAt: updated.onboardedAt?.toISOString() ?? null,
  });
}

export const PATCH = withObservability(patchHandler, { route: 'users/me' });
