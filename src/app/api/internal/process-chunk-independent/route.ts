// QStash worker — runs full pipeline (Whisper + Azure + Claude) on a single chunk independently
import type pino from 'pino';
import { NextResponse } from 'next/server';
import { Receiver } from '@upstash/qstash';
import { z } from 'zod';
import { env } from '@/lib/env';
import { withObservability } from '@/lib/observability';
import { processChunkIndependent } from '@/lib/pipeline/processChunkIndependent';

export const maxDuration = 300;

const bodySchema = z.object({
  sessionId: z.string(),
  chunkIndex: z.number().int().min(0),
  storageKey: z.string(),
  durationSecs: z.number().positive(),
  overlapSecs: z.number().min(0),
});

function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

let _receiver: Receiver | null = null;

function getReceiver(): Receiver {
  if (_receiver) {
    return _receiver;
  }
  _receiver = new Receiver({
    currentSigningKey: requireEnv(env.QSTASH_CURRENT_SIGNING_KEY, 'QSTASH_CURRENT_SIGNING_KEY'),
    nextSigningKey: requireEnv(env.QSTASH_NEXT_SIGNING_KEY, 'QSTASH_NEXT_SIGNING_KEY'),
  });
  return _receiver;
}

async function handler(req: Request, { logger }: { logger: pino.Logger; requestId: string }) {
  let sessionId: string | null = null;

  try {
    const signature = req.headers.get('upstash-signature');
    const rawBody = await req.text();

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const isValid = await getReceiver().verify({ signature, body: rawBody });
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const parsed = bodySchema.parse(JSON.parse(rawBody));
    sessionId = parsed.sessionId;

    await processChunkIndependent(parsed);

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error : new Error('Unknown error'), sessionId },
      'Independent chunk pipeline failed',
    );
    return NextResponse.json({ error: 'Chunk processing failed' }, { status: 500 });
  }
}

export const POST = withObservability(handler, { route: 'internal/process-chunk-independent' });
