// Internal endpoint: backfill improvedText for sessions that have vocab suggestions but no rewritten transcript

import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/prisma';
import { findOrCreateUser } from '@/lib/db-utils';
import { errorResponse, successResponse } from '@/lib/api';
import { withObservability } from '@/lib/observability';
import { rewriteTranscript } from '@/lib/ai/rewriteTranscript';
import type pino from 'pino';
import { z } from 'zod';

const RequestBodySchema = z.object({
  limit: z.number().int().min(1).max(20).default(5),
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
      improvedText: null,
    },
    orderBy: { session: { createdAt: 'desc' } },
    take: limit,
    select: { id: true, sessionId: true, text: true },
  });

  const results: Array<{ sessionId: string; wordsUsed: string[]; status: string }> = [];

  for (const t of transcripts) {
    const vocabSuggestions = await prisma.vocabSuggestion.findMany({
      where: { suggestedInSessionId: t.sessionId },
      select: { word: true, meaning: true, exampleSentence: true },
    });

    if (vocabSuggestions.length === 0) {
      results.push({ sessionId: t.sessionId, wordsUsed: [], status: 'skipped-no-vocab' });
      continue;
    }

    if (dryRun) {
      results.push({ sessionId: t.sessionId, wordsUsed: vocabSuggestions.map((v) => v.word), status: 'dry-run' });
      continue;
    }

    const rewriteResult = await rewriteTranscript(t.text, vocabSuggestions);

    if (rewriteResult) {
      await prisma.transcript.update({
        where: { id: t.id },
        data: { improvedText: rewriteResult.improvedText, wordsUsed: rewriteResult.wordsUsed },
      });
      results.push({ sessionId: t.sessionId, wordsUsed: rewriteResult.wordsUsed, status: 'updated' });
    } else {
      results.push({ sessionId: t.sessionId, wordsUsed: [], status: 'skipped-rewrite-failed' });
    }

    logger.info(
      { sessionId: t.sessionId, dryRun, wordsUsed: rewriteResult?.wordsUsed ?? [] },
      'Backfill improved transcript',
    );
  }

  return successResponse({
    processed: results.length,
    dryRun,
    results,
  });
}

export const POST = withObservability(postHandler, { route: 'internal/backfill-improved-transcripts' });
