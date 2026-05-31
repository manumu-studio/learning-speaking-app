// Vercel Cron — re-drives stuck chunked sessions or marks them FAILED
import { NextRequest, NextResponse } from 'next/server';
import { ChunkStatus, SessionStatus } from '@prisma/client';
import { env } from '@/lib/env';
import { prisma } from '@/lib/prisma';
import { maybeEnqueueFinalProcessing } from '@/lib/pipeline/processChunk';
import { withObservability } from '@/lib/observability';
import type pino from 'pino';

const STUCK_STATUSES: SessionStatus[] = [
  SessionStatus.UPLOADED,
  SessionStatus.CHUNKS_PROCESSING,
  SessionStatus.AWAITING_FINAL,
  SessionStatus.PROCESSING_FINAL,
];

const STUCK_THRESHOLD_MS = 5 * 60 * 1000;

function isAuthorized(request: Request): boolean {
  if (env.CRON_SECRET === undefined) {
    return false;
  }
  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${env.CRON_SECRET}`;
}

async function handler(req: Request, { logger }: { logger: pino.Logger; requestId: string }) {
  // Cast to NextRequest for header access compatibility
  const request = req as NextRequest;

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - STUCK_THRESHOLD_MS);
  const stuckSessions = await prisma.speakingSession.findMany({
    where: {
      isChunked: true,
      status: { in: STUCK_STATUSES },
      updatedAt: { lt: cutoff },
    },
    select: {
      id: true,
      status: true,
      chunkCount: true,
      chunks: {
        select: {
          status: true,
          updatedAt: true,
        },
      },
    },
  });

  let redriven = 0;
  let markedFailed = 0;
  let skipped = 0;

  for (const session of stuckSessions) {
    const hasFailedChunk = session.chunks.some((chunk) => chunk.status === ChunkStatus.FAILED);
    if (hasFailedChunk) {
      await prisma.speakingSession.update({
        where: { id: session.id },
        data: {
          status: SessionStatus.FAILED,
          errorMessage: 'One or more audio segments failed to process',
        },
      });
      markedFailed += 1;
      continue;
    }

    const recentlyUpdated = session.chunks.some(
      (chunk) => chunk.updatedAt.getTime() > cutoff.getTime(),
    );
    if (recentlyUpdated) {
      skipped += 1;
      continue;
    }

    const doneCount = session.chunks.filter(
      (chunk) => chunk.status === ChunkStatus.CHUNK_DONE,
    ).length;

    if (session.chunkCount != null && doneCount === session.chunkCount) {
      await maybeEnqueueFinalProcessing(session.id);
      redriven += 1;
      continue;
    }

    if (session.status === SessionStatus.UPLOADED || session.status === SessionStatus.CHUNKS_PROCESSING) {
      await prisma.speakingSession.update({
        where: { id: session.id },
        data: {
          status: SessionStatus.FAILED,
          errorMessage: 'Session processing timed out',
        },
      });
      markedFailed += 1;
      continue;
    }

    skipped += 1;
  }

  logger.info(
    { scanned: stuckSessions.length, redriven, markedFailed, skipped },
    'Stuck session sweep complete',
  );

  return NextResponse.json({
    ok: true,
    scanned: stuckSessions.length,
    redriven,
    markedFailed,
    skipped,
  });
}

export const GET = withObservability(handler, { route: 'cron/sweep-stuck-sessions' });
