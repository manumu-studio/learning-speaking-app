// GET session pitch contour — stitches ChunkFeature rows for visualization
import { auth } from '@/features/auth/auth';
import { errorResponse, successResponse } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { stitchContours } from '@/lib/pitch';
import { withObservability } from '@/lib/observability';
import type pino from 'pino';
import { z } from 'zod';

const PitchResponseSchema = z.object({
  contour: z
    .object({
      frameMs: z.number(),
      f0Hz: z.array(z.number()),
      intensityDb: z.array(z.number()),
      voiced: z.array(z.boolean()),
      durationMs: z.number(),
    })
    .nullable(),
});

async function handler(req: Request, { logger }: { logger: pino.Logger; requestId: string }): Promise<Response> {
  // Extract session id from URL path: /api/sessions/[id]/pitch
  const pathParts = new URL(req.url).pathname.split('/');
  const id = pathParts.at(-2) ?? '';

  const session = await auth();
  if (!session?.user?.externalId) {
    return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
  }

  const user = await prisma.user.findUnique({
    where: { externalId: session.user.externalId },
  });

  if (!user) {
    return errorResponse('User not found', 'USER_NOT_FOUND', 404);
  }

  const speakingSession = await prisma.speakingSession.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });

  if (!speakingSession) {
    return errorResponse('Session not found', 'SESSION_NOT_FOUND', 404);
  }

  const features = await prisma.chunkFeature.findMany({
    where: { sessionId: id },
    orderBy: { chunkIndex: 'asc' },
    select: {
      startMs: true,
      endMs: true,
      frameMs: true,
      f0Hz: true,
      intensityDb: true,
      voiced: true,
    },
  });

  const contour =
    features.length === 0
      ? null
      : stitchContours(
          features.map((feature) => ({
            startMs: feature.startMs,
            endMs: feature.endMs,
            frameMs: feature.frameMs,
            f0Hz: feature.f0Hz,
            intensityDb: feature.intensityDb,
            voiced: feature.voiced,
          })),
        );

  try {
    const payload = PitchResponseSchema.parse({ contour });
    return successResponse(payload, 200, {
      'Cache-Control': 'private, max-age=60, stale-while-revalidate=120',
    });
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error : new Error('Unknown error') },
      'Pitch contour response validation failed',
    );
    return errorResponse('Failed to fetch pitch contour', 'INTERNAL_ERROR', 500);
  }
}

export const GET = withObservability(handler, { route: 'sessions/[id]/pitch' });
