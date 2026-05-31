// Webhook handler for async session processing (QStash → executePipeline)
import type pino from 'pino';
import { NextRequest, NextResponse } from 'next/server';
import { Receiver } from '@upstash/qstash';
import { env } from '@/lib/env';
import {
  executePipeline,
  isQstashFinalFailureAttempt,
  persistSessionFailedStatus,
} from '@/lib/pipeline';
import { withObservability } from '@/lib/observability';
import { z } from 'zod';

// Tell Vercel Fluid Compute this function may run up to 3 minutes.
// Required for long audio files processed by Whisper + Azure Speech.
export const maxDuration = 180;

const processBodySchema = z.object({ sessionId: z.string() });

// Runtime validation — QStash signing keys are optional in env.ts but required here
function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Lazy singleton — consistent with r2.ts, qstash.ts, whisper.ts, analyze.ts
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
  const request = req as NextRequest;
  let sessionId: string | null = null;

  try {
    // Verify QStash signature — body must be read once as text
    const signature = request.headers.get('upstash-signature');
    const body = await request.text();

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const isValid = await getReceiver().verify({ signature, body });
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    // Parse body
    const parseResult = processBodySchema.safeParse(JSON.parse(body));
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Missing sessionId', code: 'BAD_REQUEST' }, { status: 400 });
    }
    sessionId = parseResult.data.sessionId;

    await executePipeline(sessionId, 'production');

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(
      { sessionId: sessionId ?? undefined, err: new Error(message) },
      'Processing failed',
    );

    if (sessionId && isQstashFinalFailureAttempt(request)) {
      await persistSessionFailedStatus(sessionId, message);
    }

    return NextResponse.json({ error: 'Processing failed', code: 'PROCESSING_ERROR' }, { status: 500 });
  }
}

export const POST = withObservability(handler, { route: 'internal/process' });
