// Webhook handler for async session processing (QStash → executePipeline)
import { NextRequest, NextResponse } from 'next/server';
import { Receiver } from '@upstash/qstash';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import { SessionStatus } from '@prisma/client';
import { executePipeline } from '@/lib/pipeline';
import { log } from '@/lib/logger';
import { z } from 'zod';

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

export async function POST(request: NextRequest) {
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
    log({
      level: 'error',
      message: 'Processing failed',
      sessionId: sessionId ?? undefined,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Only mark FAILED on final QStash retry attempt
    const retriedHeader = request.headers.get('upstash-retried');
    const maxRetriesHeader = request.headers.get('upstash-max-retries');
    const retried = retriedHeader !== null ? parseInt(retriedHeader, 10) : null;
    const maxRetries = maxRetriesHeader !== null ? parseInt(maxRetriesHeader, 10) : null;
    const isFinalAttempt = retried === null || maxRetries === null || retried >= maxRetries - 1;

    if (sessionId && isFinalAttempt) {
      try {
        await prisma.speakingSession.update({
          where: { id: sessionId },
          data: {
            status: SessionStatus.FAILED,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      } catch (dbError) {
        log({
          level: 'error',
          message: 'Failed to update session status to FAILED',
          sessionId: sessionId ?? undefined,
          error: dbError instanceof Error ? dbError.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({ error: 'Processing failed', code: 'PROCESSING_ERROR' }, { status: 500 });
  }
}
