// Webhook handler for async session processing (QStash → executePipeline)
import { NextRequest, NextResponse } from 'next/server';
import { Receiver } from '@upstash/qstash';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import { SessionStatus } from '@prisma/client';
import { log } from '@/lib/logger';
import { z } from 'zod';
import { executePipeline, PipelineHttpError } from '@/lib/pipeline/executePipeline';

const processBodySchema = z.object({ sessionId: z.string() });

/**
 * Ensures a required environment variable is present and returns its value.
 *
 * @param value - The environment variable value to validate.
 * @param name - The environment variable name used in the error message.
 * @returns The validated environment variable value.
 * @throws Error if `value` is falsy; message: "Missing required environment variable: <name>".
 */
function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

let _receiver: Receiver | null = null;

/**
 * Get the cached Receiver configured with QStash signing keys.
 *
 * @returns The singleton Receiver configured with the current and next QStash signing keys
 */
function getReceiver(): Receiver {
  if (_receiver) {
    return _receiver;
  }
  const currentSigningKey = requireEnv(env.QSTASH_CURRENT_SIGNING_KEY, 'QSTASH_CURRENT_SIGNING_KEY');
  const nextSigningKey = requireEnv(env.QSTASH_NEXT_SIGNING_KEY, 'QSTASH_NEXT_SIGNING_KEY');
  _receiver = new Receiver({ currentSigningKey, nextSigningKey });
  return _receiver;
}

/**
 * HTTP POST handler for QStash webhook callbacks that verifies the request signature,
 * extracts a `sessionId` from the request body, and triggers asynchronous session processing.
 *
 * @param request - The incoming Next.js request representing the QStash webhook callback. Expects the `upstash-signature` header and a JSON body containing `sessionId`.
 * @returns A JSON HTTP response:
 * - `{ ok: true }` with status 200 when processing is successfully scheduled.
 * - `{ error: 'Missing signature', code: 'UNAUTHORIZED' }` with status 401 when the signature header is absent.
 * - `{ error: 'Invalid signature', code: 'UNAUTHORIZED' }` with status 401 when signature verification fails.
 * - `{ error: 'Missing sessionId', code: 'BAD_REQUEST' }` with status 400 when the body is missing or does not contain `sessionId`.
 * - `{ error: <message>, code: <code> }` with the status provided by a thrown `PipelineHttpError` when the pipeline reports an HTTP-style error.
 * - `{ error: 'Processing failed', code: 'PROCESSING_ERROR' }` with status 500 for other unexpected failures (the handler will attempt to mark the session `FAILED` on the final retry attempt).
 */
export async function POST(request: NextRequest) {
  let sessionId: string | null = null;

  try {
    const signature = request.headers.get('upstash-signature');
    const body = await request.text();

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const isValid = await getReceiver().verify({ signature, body });
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid signature', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const parseResult = processBodySchema.safeParse(JSON.parse(body));
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Missing sessionId', code: 'BAD_REQUEST' },
        { status: 400 }
      );
    }
    sessionId = parseResult.data.sessionId;

    await executePipeline(sessionId, 'production');

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof PipelineHttpError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }

    log({
      level: 'error',
      message: 'Processing failed',
      sessionId: sessionId ?? undefined,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    const retriedHeader = request.headers.get('upstash-retried');
    const maxRetriesHeader = request.headers.get('upstash-max-retries');
    const retried = retriedHeader !== null ? parseInt(retriedHeader, 10) : null;
    const maxRetries = maxRetriesHeader !== null ? parseInt(maxRetriesHeader, 10) : null;

    const isFinalAttempt =
      retried === null || maxRetries === null || retried >= maxRetries - 1;

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

    return NextResponse.json(
      { error: 'Processing failed', code: 'PROCESSING_ERROR' },
      { status: 500 }
    );
  }
}
