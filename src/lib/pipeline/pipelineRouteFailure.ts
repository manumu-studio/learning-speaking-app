// Shared failure handling for HTTP routes that invoke executePipeline — DB FAILED status + QStash retry rules
import type { NextRequest } from 'next/server';
import { SessionStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { log } from '@/lib/logger';

/** Mirrors previous internal route logic: mark FAILED only on final QStash retry attempt. */
export function isQstashFinalFailureAttempt(request: NextRequest): boolean {
  const retriedHeader = request.headers.get('upstash-retried');
  const maxRetriesHeader = request.headers.get('upstash-max-retries');
  const retried = retriedHeader !== null ? parseInt(retriedHeader, 10) : null;
  const maxRetries = maxRetriesHeader !== null ? parseInt(maxRetriesHeader, 10) : null;
  return retried === null || maxRetries === null || retried >= maxRetries - 1;
}

export async function persistSessionFailedStatus(
  sessionId: string,
  errorMessage: string,
): Promise<void> {
  try {
    await prisma.speakingSession.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.FAILED,
        errorMessage,
      },
    });
  } catch (dbError) {
    log({
      level: 'error',
      message: 'Failed to update session status to FAILED',
      sessionId,
      error: dbError instanceof Error ? dbError.message : 'Unknown error',
    });
  }
}
