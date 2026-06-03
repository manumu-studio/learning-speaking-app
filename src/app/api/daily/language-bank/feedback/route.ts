// POST /api/daily/language-bank/feedback — record usage, swap targets, or mark item status
import { z } from 'zod';
import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/prisma';
import { errorResponse, successResponse } from '@/lib/api';
import { withObservability } from '@/lib/observability';
import { resolveUser } from '@/app/api/users/me/daily-summaries/route.helpers';
import type { ObservabilityContext } from '@/lib/observability';

// ─── Validation ───────────────────────────────────────────────────────────────

const FeedbackBodySchema = z.object({
  itemId: z.string(),
  action: z.enum(['used', 'swap_target', 'dismiss']),
});

// ─── Handler ──────────────────────────────────────────────────────────────────

async function handler(req: Request, _ctx: ObservabilityContext): Promise<Response> {
  const session = await auth();
  if (!session?.user?.externalId) {
    return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse('Request body must be valid JSON', 'VALIDATION_ERROR', 400);
  }

  const parsed = FeedbackBodySchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('itemId and action are required', 'VALIDATION_ERROR', 400);
  }

  const { itemId, action } = parsed.data;

  const user = await resolveUser(session.user.externalId);
  if (!user) {
    return errorResponse('User not found', 'USER_NOT_FOUND', 404);
  }

  const item = await prisma.languageBankItem.findFirst({
    where: { id: itemId, userId: user.id },
  });

  if (!item) {
    return errorResponse('Item not found', 'NOT_FOUND', 404);
  }

  if (action === 'used') {
    const updated = await prisma.languageBankItem.update({
      where: { id: itemId },
      data: { usageCount: { increment: 1 }, lastUsedAt: new Date() },
    });
    return successResponse(updated);
  }

  if (action === 'swap_target') {
    const updated = await prisma.languageBankItem.update({
      where: { id: itemId },
      data: { isActiveTarget: false },
    });
    return successResponse(updated);
  }

  // action === 'dismiss'
  await prisma.languageBankItem.delete({ where: { id: itemId } });
  return successResponse({ success: true });
}

export const POST = withObservability(handler, { route: 'daily/language-bank/feedback' });
