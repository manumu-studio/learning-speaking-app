// Returns completed ChunkResult rows for progressive display during recording
import { NextResponse } from 'next/server';
import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/prisma';
import { findOrCreateUser } from '@/lib/db-utils';
import { errorResponse } from '@/lib/api';
import { withObservability } from '@/lib/observability';
import type pino from 'pino';

async function getHandler(
  _req: Request,
  { logger: _logger }: { logger: pino.Logger; requestId: string },
  routeCtx: { params: Promise<{ id: string }> },
) {
  const { id: sessionId } = await routeCtx.params;

  const session = await auth();
  if (!session?.user?.externalId) {
    return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
  }

  const user = await findOrCreateUser(session.user.externalId, {
    email: session.user.email ?? undefined,
    displayName: session.user.name ?? undefined,
  });

  const speakingSession = await prisma.speakingSession.findFirst({
    where: { id: sessionId, userId: user.id },
    select: { id: true },
  });

  if (!speakingSession) {
    return errorResponse('Session not found', 'NOT_FOUND', 404);
  }

  const chunkResults = await prisma.chunkResult.findMany({
    where: { sessionId, status: 'DONE' },
    orderBy: { chunkIndex: 'asc' },
    select: {
      chunkIndex: true,
      transcriptText: true,
      wordCount: true,
      pronunciationReport: true,
      status: true,
      updatedAt: true,
    },
  });

  const simplified = chunkResults.map((r) => {
    let pronScore: number | null = null;
    if (
      r.pronunciationReport !== null &&
      typeof r.pronunciationReport === 'object' &&
      !Array.isArray(r.pronunciationReport) &&
      'pronScore' in r.pronunciationReport
    ) {
      const raw = (r.pronunciationReport as Record<string, unknown>)['pronScore'];
      if (typeof raw === 'number') {
        pronScore = raw;
      }
    }

    const words = r.transcriptText?.split(/\s+/) ?? [];
    const transcriptSnippet = r.transcriptText
      ? words.slice(0, 12).join(' ') + (words.length > 12 ? '…' : '')
      : null;

    return {
      chunkIndex: r.chunkIndex,
      transcriptSnippet,
      wordCount: r.wordCount,
      pronScore,
      status: r.status,
      updatedAt: r.updatedAt.toISOString(),
    };
  });

  return NextResponse.json({ chunks: simplified });
}

export const GET = (req: Request, routeCtx: { params: Promise<{ id: string }> }) =>
  withObservability(
    (r, obsCtx) => getHandler(r, obsCtx, routeCtx),
    { route: 'sessions/[id]/chunk-results' },
  )(req);
