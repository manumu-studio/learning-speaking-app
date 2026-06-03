// GET /api/daily/[date] — fetch or lazily generate a daily conclusion for a specific date
import { z } from 'zod';
import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/prisma';
import { errorResponse, successResponse } from '@/lib/api';
import { withObservability } from '@/lib/observability';
import { generateDailyConclusion } from '@/lib/daily';
import { resolveUser } from '@/app/api/users/me/daily-summaries/route.helpers';
import type { ObservabilityContext } from '@/lib/observability';

const DateParamSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD');

async function handler(
  _req: Request,
  _ctx: ObservabilityContext,
  routeCtx: { params: Promise<{ date: string }> },
): Promise<Response> {
  const session = await auth();
  if (!session?.user?.externalId) {
    return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
  }

  const { date: rawDate } = await routeCtx.params;
  const parsed = DateParamSchema.safeParse(rawDate);
  if (!parsed.success) {
    return errorResponse('date param must be YYYY-MM-DD', 'VALIDATION_ERROR', 400);
  }
  const date = parsed.data;

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

export const GET = (req: Request, routeCtx: { params: Promise<{ date: string }> }) =>
  withObservability(
    (r, obsCtx) => handler(r, obsCtx, routeCtx),
    { route: 'daily/[date]' },
  )(req);
