// QStash failure callback — marks a session chunk as FAILED after all retries are exhausted
import type pino from 'pino';
import { NextResponse } from 'next/server';
import { Receiver } from '@upstash/qstash';
import { ChunkStatus } from '@prisma/client';
import { env } from '@/lib/env';
import { prisma } from '@/lib/prisma';
import { withObservability } from '@/lib/observability';
import { z } from 'zod';

const chunkBodySchema = z.object({
  sessionId: z.string(),
  chunkIndex: z.number().int().min(0),
});

const failureCallbackSchema = z.object({
  status: z.number(),
  body: z.string().optional(),
  message: z.string().optional(),
  sourceBody: z.string(),
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

function decodeBase64Json(value: string): unknown {
  return JSON.parse(Buffer.from(value, 'base64').toString('utf-8'));
}

async function handler(req: Request, { logger }: { logger: pino.Logger; requestId: string }) {
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

    const parsed = failureCallbackSchema.safeParse(JSON.parse(rawBody));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', code: 'BAD_REQUEST' }, { status: 400 });
    }

    const originalBody = decodeBase64Json(parsed.data.sourceBody);
    const chunkPayload = chunkBodySchema.safeParse(originalBody);
    if (!chunkPayload.success) {
      return NextResponse.json({ error: 'Invalid chunk payload', code: 'BAD_REQUEST' }, { status: 400 });
    }

    const { sessionId, chunkIndex } = chunkPayload.data;
    const responseBody = parsed.data.body
      ? Buffer.from(parsed.data.body, 'base64').toString('utf-8')
      : parsed.data.message ?? 'Chunk processing failed';

    await prisma.sessionChunk.update({
      where: {
        sessionId_chunkIndex: { sessionId, chunkIndex },
      },
      data: {
        status: ChunkStatus.FAILED,
        errorMessage: responseBody,
      },
    });

    logger.error(
      { sessionId, chunkIndex, errorMessage: responseBody, status: parsed.data.status },
      'Chunk processing failed after retries',
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ err: new Error(message) }, 'Chunk failure callback handler failed');
    return NextResponse.json({ error: 'Callback processing failed', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export const POST = withObservability(handler, { route: 'internal/chunk-failed' });
