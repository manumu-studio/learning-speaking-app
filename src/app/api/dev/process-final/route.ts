// Dev-only fan-in processor — runs processFinal without QStash signature verification
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { env } from '@/lib/env';
import { persistSessionFailedStatus } from '@/lib/pipeline';
import { processFinal } from '@/lib/pipeline/processFinal';
import { log } from '@/lib/logger';

const devProcessFinalBodySchema = z.object({
  sessionId: z.string(),
});

export async function POST(request: NextRequest) {
  if (env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Dev-only endpoint', code: 'FORBIDDEN' }, { status: 403 });
  }

  let sessionId: string | null = null;

  try {
    const parsed = devProcessFinalBodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body', code: 'BAD_REQUEST' }, { status: 400 });
    }

    sessionId = parsed.data.sessionId;
    await processFinal(parsed.data.sessionId);

    return NextResponse.json({ ok: true, sessionId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log({
      level: 'error',
      message: 'Dev final processing failed',
      sessionId: sessionId ?? undefined,
      error: message,
    });

    if (sessionId) {
      await persistSessionFailedStatus(sessionId, message);
    }

    return NextResponse.json({ error: 'Dev final processing failed', message }, { status: 500 });
  }
}
