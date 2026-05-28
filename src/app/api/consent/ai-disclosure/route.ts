// AI disclosure consent endpoint — check and record user's AI disclosure acceptance
import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/prisma';
import { findOrCreateUser, hasConsent } from '@/lib/db-utils';
import { successResponse, errorResponse } from '@/lib/api';
import { validateOrigin, csrfForbiddenResponse } from '@/lib/csrf';
import { log } from '@/lib/logger';

/**
 * GET /api/consent/ai-disclosure
 * Returns whether the user has accepted AI disclosure consent.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.externalId) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const user = await prisma.user.findUnique({
      where: { externalId: session.user.externalId },
      select: { id: true },
    });

    if (!user) {
      return successResponse({ accepted: false });
    }

    const accepted = await hasConsent(user.id, 'AI_DISCLOSURE');
    return successResponse({ accepted });
  } catch (error) {
    log({
      level: 'error',
      message: 'AI disclosure consent check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return errorResponse('Failed to check AI disclosure consent', 'INTERNAL_ERROR', 500);
  }
}

/**
 * POST /api/consent/ai-disclosure
 * Records the user's acceptance of AI disclosure consent.
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.externalId) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
    }

    if (!validateOrigin(request)) {
      return csrfForbiddenResponse();
    }

    const user = await findOrCreateUser(session.user.externalId, {
      email: session.user.email ?? undefined,
      displayName: session.user.name ?? undefined,
    });

    await prisma.userConsent.upsert({
      where: { userId_flag: { userId: user.id, flag: 'AI_DISCLOSURE' } },
      create: { userId: user.id, flag: 'AI_DISCLOSURE', granted: true },
      update: { granted: true, revokedAt: null },
    });

    return successResponse({ accepted: true });
  } catch (error) {
    log({
      level: 'error',
      message: 'AI disclosure consent record failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return errorResponse('Failed to record AI disclosure consent', 'INTERNAL_ERROR', 500);
  }
}
