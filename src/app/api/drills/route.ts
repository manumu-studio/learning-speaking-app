// API route: Create a new drill attempt from a recommendation

import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/prisma';
import { findOrCreateUser } from '@/lib/db-utils';
import { errorResponse, successResponse } from '@/lib/api';
import { generateDrill } from '@/features/training/generateDrill';
import { log } from '@/lib/logger';
import { z } from 'zod';

const drillTypeEnum = z.enum(['rephrase', 'constraint', 'vocabUpgrade', 'precision', 'conclusion']);

const createDrillSchema = z.object({
  sessionId: z.string().optional(),
  drillType: drillTypeEnum,
  metricKey: z.string(),
  recentExamples: z.array(z.string()).min(1).max(5),
  focusPattern: z.string(),
});

export async function POST(request: Request) {
  try {
    const authSession = await auth();
    if (!authSession?.user?.externalId) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
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

    const { sessionId, drillType, metricKey, recentExamples, focusPattern } = parsed.data;

    const drillPrompt = await generateDrill({
      drillType,
      metricKey,
      recentExamples,
      focusPattern,
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
    log({
      level: 'error',
      message: 'Drill create failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return errorResponse('Failed to create drill', 'INTERNAL_ERROR', 500);
  }
}
