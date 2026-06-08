// GET /api/daily/[date] — fetch or lazily generate a daily conclusion for a specific date
import { z } from 'zod';
import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/prisma';
import { errorResponse, successResponse } from '@/lib/api';
import { withObservability } from '@/lib/observability';
import { generateDailyConclusion } from '@/lib/daily';
import { buildDayDetailData } from '@/lib/daily/dayDetail';
import { resolveUser } from '@/app/api/users/me/daily-summaries/route.helpers';
import type { DayDetailData } from '@/lib/daily/dayDetail';
import type { DailyConclusionData } from '@/lib/daily';
import type { ObservabilityContext } from '@/lib/observability';

const DateParamSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD');

const DAILY_CUTOFF_HOUR = 22;

function localDateKey(now: Date): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isClosedDay(date: string, now = new Date()): boolean {
  const today = localDateKey(now);
  if (date < today) return true;
  if (date > today) return false;
  return now.getHours() >= DAILY_CUTOFF_HOUR;
}

function legacyResponse(input: {
  conclusionData: DailyConclusionData;
  renderedFeedback: string;
  sessionCount: number;
  dayDetail: DayDetailData;
}) {
  const { conclusionData, renderedFeedback, sessionCount, dayDetail } = input;
  return {
    date: conclusionData.date,
    isClosed: true,
    overallScore: conclusionData.overallScore,
    totalDurationSecs: conclusionData.totalDurationSecs,
    totalWords: dayDetail.hero.totalWords,
    topicSentence: conclusionData.topicSentence,
    pillarScores: conclusionData.pillarScores,
    renderedFeedback,
    sessionCount,
    deliveryAvg: conclusionData.pillarScores.delivery,
    languageAvg: conclusionData.pillarScores.language,
    pronunciationAvg: conclusionData.pillarScores.pronunciation,
    conclusionData,
    dayDetail,
  };
}

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

  if (!isClosedDay(date)) {
    return errorResponse('Day is still open', 'DAY_OPEN', 404);
  }

  const user = await resolveUser(session.user.externalId);
  if (!user) {
    return errorResponse('User not found', 'USER_NOT_FOUND', 404);
  }

  const result = await generateDailyConclusion({ userId: user.id, date });
  if (result === null) {
    return errorResponse('No sessions for this date', 'NO_SESSIONS', 404);
  }

  const [record, dayDetail] = await Promise.all([
    prisma.dailyConclusion.findUnique({
      where: { userId_date: { userId: user.id, date } },
      select: {
        renderedFeedback: true,
        sessionCount: true,
      },
    }),
    buildDayDetailData({ userId: user.id, date }),
  ]);

  if (dayDetail === null) {
    return errorResponse('No sessions for this date', 'NO_SESSIONS', 404);
  }

  return successResponse(legacyResponse({
    conclusionData: result.conclusionData,
    renderedFeedback: record?.renderedFeedback ?? result.conclusionData.topicSentence,
    sessionCount: record?.sessionCount ?? dayDetail.hero.sessionCount,
    dayDetail,
  }));
}

export const GET = (req: Request, routeCtx: { params: Promise<{ date: string }> }) =>
  withObservability(
    (r, obsCtx) => handler(r, obsCtx, routeCtx),
    { route: 'daily/[date]' },
  )(req);
