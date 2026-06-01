// QStash fan-in worker — deduplicates chunk transcripts and writes final session results
import type pino from 'pino';
import { NextResponse } from 'next/server';
import { Receiver } from '@upstash/qstash';
import { env } from '@/lib/env';
import {
  isQstashFinalFailureAttempt,
  persistSessionFailedStatus,
} from '@/lib/pipeline';
import { processFinal, processParallelFinal } from '@/lib/pipeline/processFinal';
import { prisma } from '@/lib/prisma';
import { withObservability } from '@/lib/observability';
import { z } from 'zod';

export const maxDuration = 300;

const processFinalBodySchema = z.object({
  sessionId: z.string(),
});

function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

let _receiver: Receiver | null = null;

function getReceiver(): Receiver {
  if (_receiver) {
    return _receiver;
  }
  const currentSigningKey = requireEnv(env.QSTASH_CURRENT_SIGNING_KEY, 'QSTASH_CURRENT_SIGNING_KEY');
  const nextSigningKey = requireEnv(env.QSTASH_NEXT_SIGNING_KEY, 'QSTASH_NEXT_SIGNING_KEY');
  _receiver = new Receiver({ currentSigningKey, nextSigningKey });
  return _receiver;
}

async function handler(req: Request, { logger }: { logger: pino.Logger; requestId: string }) {
  let sessionId: string | null = null;

  try {
    const signature = req.headers.get('upstash-signature');
    const body = await req.text();

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const isValid = await getReceiver().verify({ signature, body });
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const parsed = processFinalBodySchema.safeParse(JSON.parse(body));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', code: 'BAD_REQUEST' }, { status: 400 });
    }

    sessionId = parsed.data.sessionId;

    const chunkResultCount = await prisma.chunkResult.count({
      where: { sessionId: parsed.data.sessionId },
    });

    if (chunkResultCount > 0) {
      await processParallelFinal(parsed.data.sessionId);
    } else {
      await processFinal(parsed.data.sessionId);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(
      { sessionId: sessionId ?? undefined, err: new Error(message) },
      'Final processing failed',
    );

    if (sessionId && isQstashFinalFailureAttempt(req)) {
      await persistSessionFailedStatus(sessionId, message);
    }

    return NextResponse.json({ error: 'Final processing failed', code: 'PROCESSING_ERROR' }, { status: 500 });
  }
}

export const POST = withObservability(handler, { route: 'internal/process-final' });
