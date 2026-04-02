// Dev-only sync pipeline — runs executePipeline without QStash signature verification
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import { SessionStatus } from '@prisma/client';
import { log } from '@/lib/logger';
import { executePipeline, PipelineHttpError } from '@/lib/pipeline/executePipeline';

const devProcessBodySchema = z.object({
  sessionId: z.string().optional(),
});

/**
 * Trigger the development-only pipeline for a speaking session identified in the request body.
 *
 * Expects the request JSON body to include a `sessionId` string; rejects requests when running outside development.
 *
 * On success returns a JSON response containing `ok: true`, the `sessionId`, and pipeline results (`insightCount`, `wordCount`, `summary`).
 * On unhandled errors the endpoint attempts to mark the speaking session's status as `FAILED` and set its `errorMessage`.
 *
 * @param request - The incoming Next.js request whose JSON body must contain `{ sessionId?: string }`
 * @returns A NextResponse with JSON:
 *  - Success: `{ ok: true, sessionId, insightCount, wordCount, summary }`
 *  - Client errors: `{ error, code }` (e.g., missing/invalid body or forbidden in non-development) with 400/403
 *  - Pipeline HTTP errors: `{ error, code }` with the pipeline-provided HTTP status
 *  - Internal failure: `{ error: 'Dev pipeline failed', message }` with 500
 */
export async function POST(request: NextRequest) {
  if (env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Dev-only endpoint', code: 'FORBIDDEN' },
      { status: 403 }
    );
  }

  let sessionId: string | null = null;

  try {
    const parsed = devProcessBodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', code: 'BAD_REQUEST' },
        { status: 400 }
      );
    }
    sessionId = parsed.data.sessionId ?? null;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing sessionId', code: 'BAD_REQUEST' },
        { status: 400 }
      );
    }

    log({ level: 'info', message: 'Dev pipeline starting', sessionId });

    const result = await executePipeline(sessionId, 'dev');

    return NextResponse.json({
      ok: true,
      sessionId,
      insightCount: result.insightCount,
      wordCount: result.wordCount,
      summary: result.summary,
    });
  } catch (error) {
    if (error instanceof PipelineHttpError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }

    log({
      level: 'error',
      message: 'Dev pipeline failed',
      sessionId: sessionId ?? undefined,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    if (sessionId) {
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
      {
        error: 'Dev pipeline failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
