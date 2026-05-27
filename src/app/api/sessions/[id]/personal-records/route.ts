// API route for fetching Personal Records for a completed session
import { z } from 'zod';
import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/api';
import { detectPersonalRecords } from '@/lib/personalRecords';

const PersonalRecordSchema = z.object({
  metricKey: z.enum([
    'connectorRepetition', 'structuralVariety', 'vocabularyPrecision',
    'verbAccuracy', 'argumentClosure', 'fillerUsage',
    'pronunciationAccuracy', 'prosodyScore', 'speakingRate',
  ]),
  metricLabel: z.string(),
  score: z.number(),
  timeframe: z.enum(['14-day', '30-day', 'all-time']),
  previousBest: z.number().nullable(),
  sessionDate: z.string(),
});

const PersonalRecordsResponseSchema = z.object({
  personalRecords: z.array(PersonalRecordSchema),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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
      select: {
        id: true,
        status: true,
        createdAt: true,
      },
    });

    if (!speakingSession) {
      return errorResponse('Session not found', 'SESSION_NOT_FOUND', 404);
    }

    if (speakingSession.status !== 'DONE') {
      const emptyResponse = PersonalRecordsResponseSchema.parse({ personalRecords: [] });
      return successResponse(emptyResponse);
    }

    const personalRecords = await detectPersonalRecords(
      user.id,
      speakingSession.id,
      speakingSession.createdAt,
    );

    const response = PersonalRecordsResponseSchema.parse({ personalRecords });
    return successResponse(response);
  } catch {
    return errorResponse('Failed to fetch personal records', 'INTERNAL_ERROR', 500);
  }
}
