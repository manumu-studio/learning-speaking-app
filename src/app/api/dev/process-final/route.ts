// Dev-only fan-in processor — runs processFinal without QStash signature verification
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { env } from '@/lib/env';
import { persistSessionFailedStatus } from '@/lib/pipeline';
import { processFinal } from '@/lib/pipeline/processFinal';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { pollParallelFinal } from './processFinalHelpers';

const devProcessFinalBodySchema = z.object({
  sessionId: z.string(),
});

async function runProcessing(sessionId: string): Promise<void> {
  const chunkResultCount = await prisma.chunkResult.count({
    where: { sessionId },
  });

  if (chunkResultCount > 0) {
    await pollParallelFinal(sessionId);
  } else {
    await processFinal(sessionId);
  }
}

export async function POST(request: NextRequest) {
  if (env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Dev-only endpoint', code: 'FORBIDDEN' }, { status: 403 });
  }

  let sessionId: string | null = null;

  try {
    const parsed = devProcessFinalBodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body', code: 'BAD_REQUEST' }, { status: 400 });
    }

    sessionId = parsed.data.sessionId;
    await runProcessing(sessionId);

    return NextResponse.json({ ok: true, sessionId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(
      { sessionId: sessionId ?? undefined, err: new Error(message) },
      'Dev final processing failed',
    );

    if (sessionId) {
      await persistSessionFailedStatus(sessionId, message);
    }

    return NextResponse.json({ error: 'Dev final processing failed', message }, { status: 500 });
  }
}
