// GET /api/users/me/daily-summaries — compute or return cached daily pillar averages + AI feedback
import { z } from 'zod';
import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/prisma';
import { errorResponse, successResponse } from '@/lib/api';
import { withObservability } from '@/lib/observability';
import { generateDailyFeedback } from '@/lib/ai/generateDailyFeedback';
import { PILLAR_CONFIG } from '@/features/dashboard/pillars';

const DateQuerySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD');

// Metric keys grouped by pillar — sourced from PILLAR_CONFIG (cast to string[] for .includes())
const DELIVERY_KEYS: readonly string[] = PILLAR_CONFIG.delivery.metricKeys;
const LANGUAGE_KEYS: readonly string[] = PILLAR_CONFIG.language.metricKeys;
const PRONUNCIATION_KEYS: readonly string[] = PILLAR_CONFIG.pronunciation.metricKeys;

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

async function getHandler(req: Request) {
  const session = await auth();
  if (!session?.user?.externalId) {
    return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
  }

  const url = new URL(req.url);
  const dateParam = url.searchParams.get('date');
  const parsed = DateQuerySchema.safeParse(dateParam);
  if (!parsed.success) {
    return errorResponse('date query param required (YYYY-MM-DD)', 'VALIDATION_ERROR', 400);
  }

  const dateStr = parsed.data;

  const user = await prisma.user.findUnique({
    where: { externalId: session.user.externalId },
    select: { id: true },
  });

  if (!user) {
    return errorResponse('User not found', 'NOT_FOUND', 404);
  }

  const targetDate = new Date(`${dateStr}T00:00:00.000Z`);

  // Check cache first
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

  // Compute: find sessions for this user on this date
  const dayStart = targetDate;
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);

  const sessions = await prisma.speakingSession.findMany({
    where: {
      userId: user.id,
      status: 'DONE',
      createdAt: { gte: dayStart, lt: dayEnd },
    },
    select: { id: true },
  });

  if (sessions.length === 0) {
    return errorResponse('No completed sessions on this date', 'NO_SESSIONS', 404);
  }

  const sessionIds = sessions.map((s) => s.id);

  // Fetch all metric snapshots for these sessions
  const snapshots = await prisma.metricSnapshot.findMany({
    where: { sessionId: { in: sessionIds } },
    select: { key: true, score: true },
  });

  // Group scores by pillar
  const deliveryScores = snapshots
    .filter((s) => DELIVERY_KEYS.includes(s.key))
    .map((s) => s.score);
  const languageScores = snapshots
    .filter((s) => LANGUAGE_KEYS.includes(s.key))
    .map((s) => s.score);
  const pronunciationScores = snapshots
    .filter((s) => PRONUNCIATION_KEYS.includes(s.key))
    .map((s) => s.score);

  const deliveryAvg = Math.round(mean(deliveryScores) * 10) / 10;
  const languageAvg = Math.round(mean(languageScores) * 10) / 10;
  const pronunciationAvg = Math.round(mean(pronunciationScores) * 10) / 10;

  // Fetch new vocab words learned that day (max 3)
  const vocabWords = await prisma.vocabSuggestion.findMany({
    where: {
      userId: user.id,
      createdAt: { gte: dayStart, lt: dayEnd },
    },
    select: { word: true },
    take: 3,
    orderBy: { createdAt: 'desc' },
  });

  const newWords = vocabWords.map((v) => v.word);

  // Find best and worst metric for coaching context
  const allScores = snapshots.reduce<Record<string, number[]>>((acc, s) => {
    const arr = acc[s.key] ?? [];
    arr.push(s.score);
    acc[s.key] = arr;
    return acc;
  }, {});

  const metricAverages = Object.entries(allScores).map(([key, scores]) => ({
    key,
    score: Math.round(mean(scores) * 10) / 10,
  }));

  metricAverages.sort((a, b) => b.score - a.score);
  const metricHighlight = metricAverages[0];
  const metricLow = metricAverages.length > 1 ? metricAverages[metricAverages.length - 1] : undefined;

  // Generate AI feedback
  const feedback = await generateDailyFeedback({
    deliveryAvg,
    languageAvg,
    pronunciationAvg,
    sessionCount: sessions.length,
    newWords,
    metricHighlight,
    metricLow,
  });

  // Cache in DB
  await prisma.dailySummary.create({
    data: {
      userId: user.id,
      date: targetDate,
      deliveryAvg,
      languageAvg,
      pronunciationAvg,
      newWords,
      feedback,
      sessionCount: sessions.length,
    },
  });

  return successResponse({
    date: dateStr,
    deliveryAvg,
    languageAvg,
    pronunciationAvg,
    newWords,
    feedback,
    sessionCount: sessions.length,
  });
}

export const GET = withObservability(getHandler, { route: 'users/me/daily-summaries' });
