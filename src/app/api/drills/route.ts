// API route: List drill history (GET) and create a new drill attempt (POST)

import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/prisma';
import { findOrCreateUser } from '@/lib/db-utils';
import { errorResponse, successResponse } from '@/lib/api';
import { generateDrill } from '@/features/training/generateDrill';
import { withObservability } from '@/lib/observability';
import type pino from 'pino';
import { validateOrigin, csrfForbiddenResponse } from '@/lib/csrf';
import { z } from 'zod';

const METRIC_LABELS: Record<string, string> = {
  connectorRepetition: 'Connector Repetition',
  structuralVariety: 'Structural Variety',
  vocabularyPrecision: 'Vocabulary Precision',
  verbAccuracy: 'Verb Accuracy',
  argumentClosure: 'Argument Closure',
  fillerUsage: 'Filler Usage',
};

async function getHandler(_req: Request, { logger }: { logger: pino.Logger; requestId: string }) {
  const authSession = await auth();
  if (!authSession?.user?.externalId) {
    return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
  }

  const user = await findOrCreateUser(authSession.user.externalId, {
    email: authSession.user.email ?? undefined,
    displayName: authSession.user.name ?? undefined,
  });

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  try {
    const [drills, totalCompleted, weeklyCompleted, improvedCount, metricGroups] = await Promise.all([
      prisma.drillAttempt.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          drillType: true,
          metricKey: true,
          improved: true,
          completedAt: true,
          createdAt: true,
        },
      }),
      prisma.drillAttempt.count({
        where: { userId: user.id, completedAt: { not: null } },
      }),
      prisma.drillAttempt.count({
        where: {
          userId: user.id,
          completedAt: { not: null, gte: weekAgo },
        },
      }),
      prisma.drillAttempt.count({
        where: { userId: user.id, completedAt: { not: null }, improved: true },
      }),
      prisma.drillAttempt.groupBy({
        by: ['metricKey'],
        where: { userId: user.id, completedAt: { not: null } },
        _count: { _all: true },
      }),
    ]);

    const improvementRate = totalCompleted > 0 ? (improvedCount / totalCompleted) * 100 : 0;

    const drillsWithLabels = drills.map((d) => ({
      id: d.id,
      drillType: d.drillType,
      metricKey: d.metricKey,
      metricLabel: METRIC_LABELS[d.metricKey] ?? d.metricKey,
      improved: d.improved,
      createdAt: d.createdAt.toISOString(),
      completedAt: d.completedAt?.toISOString() ?? null,
    }));

    return successResponse({
      drills: drillsWithLabels,
      stats: {
        totalCompleted,
        weeklyCompleted,
        improvementRate,
        byMetric: Object.fromEntries(metricGroups.map((g) => [g.metricKey, g._count._all])),
      },
    }, 200, { 'Cache-Control': 'private, no-store' });
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error : new Error('Unknown error') },
      'Drill list failed',
    );
    return errorResponse('Failed to load drills', 'INTERNAL_ERROR', 500);
  }
}

const drillTypeEnum = z.enum(['rephrase', 'constraint', 'vocabUpgrade', 'precision', 'conclusion']);

const createDrillSchema = z.object({
  sessionId: z.string().optional(),
  drillType: drillTypeEnum,
  metricKey: z.string(),
  recentExamples: z.array(z.string()).min(1).max(5),
  focusPattern: z.string(),
  intentLabel: z.string().nullable().optional(),
  sessionTranscript: z.string().optional(),
});

async function postHandler(request: Request, { logger }: { logger: pino.Logger; requestId: string }) {
  const authSession = await auth();
  if (!authSession?.user?.externalId) {
    return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
  }

  if (!validateOrigin(request)) {
    return csrfForbiddenResponse();
  }

  const user = await findOrCreateUser(authSession.user.externalId, {
    email: authSession.user.email ?? undefined,
    displayName: authSession.user.name ?? undefined,
  });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 'INVALID_JSON', 400);
  }

  const parsed = createDrillSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('Invalid request', 'INVALID_BODY', 400);
  }

  const { sessionId, drillType, metricKey, recentExamples, focusPattern, intentLabel, sessionTranscript } =
    parsed.data;

  try {
    const drillPrompt = await generateDrill({
      drillType,
      metricKey,
      recentExamples,
      focusPattern,
      intentLabel: intentLabel ?? undefined,
      sessionTranscript,
    });

    const drill = await prisma.drillAttempt.create({
      data: {
        userId: user.id,
        sessionId: sessionId ?? null,
        drillType: drillPrompt.drillType,
        metricKey: drillPrompt.metricKey,
        prompt: drillPrompt.prompt,
        sourceExample: drillPrompt.sourceExample,
      },
    });

    return successResponse({
      id: drill.id,
      drillType: drill.drillType,
      metricKey: drill.metricKey,
      prompt: drill.prompt,
      sourceExample: drill.sourceExample,
      timeLimit: drillPrompt.timeLimit,
    });
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error : new Error('Unknown error') },
      'Drill create failed',
    );
    return errorResponse('Failed to create drill', 'INTERNAL_ERROR', 500);
  }
}

export const GET = withObservability(getHandler, { route: 'drills' });
export const POST = withObservability(postHandler, { route: 'drills' });
