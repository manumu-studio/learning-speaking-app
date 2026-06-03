// GET /api/daily/language-bank — returns user's language bank items with active targets
import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/prisma';
import { errorResponse, successResponse } from '@/lib/api';
import { withObservability } from '@/lib/observability';
import { resolveUser } from '@/app/api/users/me/daily-summaries/route.helpers';
import type { ObservabilityContext } from '@/lib/observability';

async function handler(_req: Request, _ctx: ObservabilityContext): Promise<Response> {
  const session = await auth();
  if (!session?.user?.externalId) {
    return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
  }

  const user = await resolveUser(session.user.externalId);
  if (!user) {
    return errorResponse('User not found', 'USER_NOT_FOUND', 404);
  }

  const items = await prisma.languageBankItem.findMany({
    where: { userId: user.id },
    orderBy: [{ masteryState: 'asc' }, { text: 'asc' }],
  });

  const activeTargets = items.filter((i) => i.isActiveTarget);

  return successResponse({ items, activeTargets });
}

export const GET = withObservability(handler, { route: 'daily/language-bank' });
