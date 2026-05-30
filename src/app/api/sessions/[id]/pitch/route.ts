// GET session pitch contour — stitches ChunkFeature rows for visualization
import { auth } from '@/features/auth/auth';
import { errorResponse, successResponse } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { stitchContours } from '@/lib/pitch';
import { logger } from '@/lib/logger';
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params;

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

    const payload = PitchResponseSchema.parse({ contour });
    return successResponse(payload, 200, {
      'Cache-Control': 'private, max-age=60, stale-while-revalidate=120',
    });
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error : new Error('Unknown error') },
      'Pitch contour fetch failed',
    );
    return errorResponse('Failed to fetch pitch contour', 'INTERNAL_ERROR', 500);
  }
}
