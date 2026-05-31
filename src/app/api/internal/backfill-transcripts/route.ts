// Internal endpoint: re-polish existing transcripts with punctuation and capitalization

import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/prisma';
import { findOrCreateUser } from '@/lib/db-utils';
import { errorResponse, successResponse } from '@/lib/api';
import { withObservability } from '@/lib/observability';
import { polishTranscript } from '@/lib/ai/polishTranscript';
import type pino from 'pino';
import { z } from 'zod';

const RequestBodySchema = z.object({
  limit: z.number().int().min(1).max(50).default(10),
  dryRun: z.boolean().default(false),
});

async function postHandler(req: Request, { logger }: { logger: pino.Logger; requestId: string }) {
  const authSession = await auth();
  if (!authSession?.user?.externalId) {
    return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
  }

  const user = await findOrCreateUser(authSession.user.externalId, {
    email: authSession.user.email ?? undefined,
    displayName: authSession.user.name ?? undefined,
  });

  const raw: unknown = await req.json();
  const parsed = RequestBodySchema.safeParse(raw);
  if (!parsed.success) {
    return errorResponse('Invalid request body', 'VALIDATION_ERROR', 400);
  }

  const { limit, dryRun } = parsed.data;

  const transcripts = await prisma.transcript.findMany({
    where: {
      session: { userId: user.id },
    },
    orderBy: { session: { createdAt: 'desc' } },
    take: limit,
    select: { id: true, sessionId: true, text: true, wordCount: true },
  });

  const results: Array<{ sessionId: string; before: number; after: number }> = [];

  for (const t of transcripts) {
    const polished = await polishTranscript(t.text);
    const newWordCount = polished.split(/\s+/).filter(Boolean).length;

    if (!dryRun && polished !== t.text) {
      await prisma.transcript.update({
        where: { id: t.id },
        data: { text: polished, wordCount: newWordCount },
      });
    }

    results.push({
      sessionId: t.sessionId,
      before: t.text.length,
      after: polished.length,
    });

    logger.info(
      { sessionId: t.sessionId, dryRun, changed: polished !== t.text },
      'Backfill transcript',
    );
  }

  return successResponse({
    processed: results.length,
    dryRun,
    results,
  });
}

export const POST = withObservability(postHandler, { route: 'internal/backfill-transcripts' });
