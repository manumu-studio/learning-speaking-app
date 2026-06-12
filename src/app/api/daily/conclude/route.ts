// POST /api/daily/conclude — explicitly trigger daily conclusion generation for a date
import { z } from 'zod';
import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/prisma';
import { errorResponse, successResponse } from '@/lib/api';
import { withObservability } from '@/lib/observability';
import { generateDailyConclusion } from '@/lib/daily';
import { resolveUser } from '@/app/api/users/me/daily-summaries/route.helpers';
import type { ObservabilityContext } from '@/lib/observability';

const BodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
});

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

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('date is required (YYYY-MM-DD)', 'VALIDATION_ERROR', 400);
  }
  const { date } = parsed.data;

  const user = await resolveUser(session.user.externalId);
  if (!user) {
    return errorResponse('User not found', 'USER_NOT_FOUND', 404);
  }

  const result = await generateDailyConclusion({ userId: user.id, date });
  if (result === null) {
    return errorResponse('No sessions for this date', 'NO_SESSIONS', 404);
  }

  const record = await prisma.dailyConclusion.findUnique({
    where: { userId_date: { userId: user.id, date } },
    select: {
      renderedFeedback: true,
      sessionCount: true,
    },
  });

  const { conclusionData } = result;

  return successResponse({
    date: conclusionData.date,
    overallScore: conclusionData.overallScore,
    totalDurationSecs: conclusionData.totalDurationSecs,
    topicSentence: conclusionData.topicSentence,
    renderedFeedback: record?.renderedFeedback ?? conclusionData.topicSentence,
    sessionCount: record?.sessionCount ?? 0,
    deliveryAvg: conclusionData.pillarScores.delivery,
    languageAvg: conclusionData.pillarScores.language,
    pronunciationAvg: conclusionData.pillarScores.pronunciation,
    conclusionData,
  });
}

export const POST = withObservability(handler, { route: 'daily/conclude', getSession: auth });
