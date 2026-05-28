// Dev-only chunk processor — runs processChunk without QStash signature verification
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { env } from '@/lib/env';
import { persistSessionFailedStatus } from '@/lib/pipeline';
import { processChunk } from '@/lib/pipeline/processChunk';
import { log } from '@/lib/logger';

const devProcessChunkBodySchema = z.object({
  sessionId: z.string(),
  chunkIndex: z.number().int().min(0),
});

export async function POST(request: NextRequest) {
  if (env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Dev-only endpoint', code: 'FORBIDDEN' }, { status: 403 });
  }

  let sessionId: string | null = null;

  try {
    const parsed = devProcessChunkBodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body', code: 'BAD_REQUEST' }, { status: 400 });
    }

    sessionId = parsed.data.sessionId;
    await processChunk(parsed.data.sessionId, parsed.data.chunkIndex);

    return NextResponse.json({ ok: true, sessionId, chunkIndex: parsed.data.chunkIndex });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log({
      level: 'error',
      message: 'Dev chunk processing failed',
      sessionId: sessionId ?? undefined,
      error: message,
    });

    if (sessionId) {
      await persistSessionFailedStatus(sessionId, message);
    }

    return NextResponse.json({ error: 'Dev chunk processing failed', message }, { status: 500 });
  }
}
