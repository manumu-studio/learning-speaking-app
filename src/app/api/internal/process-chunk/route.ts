// QStash worker — processes a single uploaded session chunk
import { NextRequest, NextResponse } from 'next/server';
import { Receiver } from '@upstash/qstash';
import { env } from '@/lib/env';
import {
  isQstashFinalFailureAttempt,
  persistSessionFailedStatus,
} from '@/lib/pipeline';
import { processChunk } from '@/lib/pipeline/processChunk';
import { log } from '@/lib/logger';
import { z } from 'zod';

export const maxDuration = 300;

const processChunkBodySchema = z.object({
  sessionId: z.string(),
  chunkIndex: z.number().int().min(0),
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

export async function POST(request: NextRequest) {
  let sessionId: string | null = null;

  try {
    const signature = request.headers.get('upstash-signature');
    const body = await request.text();

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const isValid = await getReceiver().verify({ signature, body });
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const parsed = processChunkBodySchema.safeParse(JSON.parse(body));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', code: 'BAD_REQUEST' }, { status: 400 });
    }

    sessionId = parsed.data.sessionId;
    await processChunk(parsed.data.sessionId, parsed.data.chunkIndex);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log({
      level: 'error',
      message: 'Chunk processing failed',
      sessionId: sessionId ?? undefined,
      error: message,
    });

    if (sessionId && isQstashFinalFailureAttempt(request)) {
      await persistSessionFailedStatus(sessionId, message);
    }

    return NextResponse.json({ error: 'Chunk processing failed', code: 'PROCESSING_ERROR' }, { status: 500 });
  }
}
