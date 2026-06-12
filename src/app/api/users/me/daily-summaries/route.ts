// DEPRECATED: Use GET /api/daily/[date] instead (richer DailyConclusion with structured JSON)
// GET /api/users/me/daily-summaries — compute or return cached daily pillar averages + AI feedback
import { z } from 'zod';
import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/prisma';
import { errorResponse, successResponse } from '@/lib/api';
import { withObservability } from '@/lib/observability';
import { generateDailyFeedback } from '@/lib/ai/generateDailyFeedback';
import {
  resolveUser,
  fetchSessionIdsForDay,
  fetchSnapshotsForSessions,
  fetchNewVocabWords,
  computePillarAverages,
  computeMetricAverages,
} from './route.helpers';

const DateQuerySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD');

async function getHandler(req: Request) {
  const session = await auth();
  if (!session?.user?.externalId) {
    return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
  }

  const url = new URL(req.url);
  const parsed = DateQuerySchema.safeParse(url.searchParams.get('date'));
  if (!parsed.success) {
    return errorResponse('date query param required (YYYY-MM-DD)', 'VALIDATION_ERROR', 400);
  }

  const dateStr = parsed.data;
  const user = await resolveUser(session.user.externalId);
  if (!user) {
    return errorResponse('User not found', 'NOT_FOUND', 404);
  }

  const targetDate = new Date(`${dateStr}T00:00:00.000Z`);

  // Return cached result if available
  const cached = await prisma.dailySummary.findUnique({
    where: { userId_date: { userId: user.id, date: targetDate } },
  });
  if (cached) {
    return successResponse({
      date: dateStr,
      deliveryAvg: cached.deliveryAvg,
      languageAvg: cached.languageAvg,
      pronunciationAvg: cached.pronunciationAvg,
      newWords: cached.newWords,
      feedback: cached.feedback,
      sessionCount: cached.sessionCount,
    });
  }

  const dayStart = targetDate;
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);

  const sessionIds = await fetchSessionIdsForDay(user.id, dayStart, dayEnd);
  if (sessionIds.length === 0) {
    return errorResponse('No completed sessions on this date', 'NO_SESSIONS', 404);
  }

  const snapshots = await fetchSnapshotsForSessions(sessionIds);
  const { deliveryAvg, languageAvg, pronunciationAvg } = computePillarAverages(snapshots);
  const newWords = await fetchNewVocabWords(user.id, dayStart, dayEnd);

  const metricAverages = computeMetricAverages(snapshots);
  const metricHighlight = metricAverages[0];
  const metricLow = metricAverages.length > 1 ? metricAverages[metricAverages.length - 1] : undefined;

  const feedback = await generateDailyFeedback({
    deliveryAvg,
    languageAvg,
    pronunciationAvg,
    sessionCount: sessionIds.length,
    newWords,
    metricHighlight,
    metricLow,
  });

  await prisma.dailySummary.create({
    data: {
      userId: user.id,
      date: targetDate,
      deliveryAvg,
      languageAvg,
      pronunciationAvg,
      newWords,
      feedback,
      sessionCount: sessionIds.length,
    },
  });

  return successResponse({
    date: dateStr,
    deliveryAvg,
    languageAvg,
    pronunciationAvg,
    newWords,
    feedback,
    sessionCount: sessionIds.length,
  });
}

export const GET = withObservability(getHandler, { route: 'users/me/daily-summaries', getSession: auth });
