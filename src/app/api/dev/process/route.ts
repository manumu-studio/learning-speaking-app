// Dev-only sync pipeline — runs processing without QStash signature verification
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { env } from '@/lib/env';
import { executePipeline, persistSessionFailedStatus } from '@/lib/pipeline';
import { log } from '@/lib/logger';

const devProcessBodySchema = z.object({ sessionId: z.string().optional() });

export async function POST(request: NextRequest) {
  // Hard block — never accessible outside development
  if (env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Dev-only endpoint', code: 'FORBIDDEN' }, { status: 403 });
  }

  let sessionId: string | null = null;

  try {
    const parsed = devProcessBodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body', code: 'BAD_REQUEST' }, { status: 400 });
    }
    sessionId = parsed.data.sessionId ?? null;

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId', code: 'BAD_REQUEST' }, { status: 400 });
    }

    await executePipeline(sessionId, 'dev');

    return NextResponse.json({ ok: true, sessionId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log({
      level: 'error',
      message: 'Dev pipeline failed',
      sessionId: sessionId ?? undefined,
      error: message,
    });

    if (sessionId) {
      await persistSessionFailedStatus(sessionId, message);
    }

    return NextResponse.json(
      { error: 'Dev pipeline failed', message },
      { status: 500 }
    );
  }
}
