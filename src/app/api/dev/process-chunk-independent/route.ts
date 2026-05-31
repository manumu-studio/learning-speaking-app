// Dev-only independent chunk processor — runs processChunkIndependent without QStash
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { processChunkIndependent } from '@/lib/pipeline/processChunkIndependent';

const devBodySchema = z.object({
  sessionId: z.string(),
  chunkIndex: z.number().int().min(0),
  storageKey: z.string(),
  durationSecs: z.number().positive(),
  overlapSecs: z.number().min(0),
});

export async function POST(request: NextRequest) {
  if (env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Dev-only endpoint', code: 'FORBIDDEN' }, { status: 403 });
  }

  let sessionId: string | null = null;

  try {
    const parsed = devBodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body', code: 'BAD_REQUEST' }, { status: 400 });
    }

    sessionId = parsed.data.sessionId;
    await processChunkIndependent(parsed.data);

    return NextResponse.json({ ok: true, sessionId, chunkIndex: parsed.data.chunkIndex });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(
      { sessionId: sessionId ?? undefined, err: new Error(message) },
      'Dev independent chunk processing failed',
    );
    return NextResponse.json({ error: 'Dev chunk processing failed' }, { status: 500 });
  }
}
