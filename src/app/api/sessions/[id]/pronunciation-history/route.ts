// API route — returns pronunciation score history for the last 7 completed sessions for the current user
import { auth } from '@/features/auth/auth';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/api';
import { z } from 'zod';

/** How many past sessions to return */
const HISTORY_WINDOW = 7;

const SessionHistoryItemSchema = z.object({
  sessionId: z.string(),
  createdAt: z.string(),
  fluencyScore: z.number(),
  accuracyScore: z.number(),
  pronScore: z.number(),
});

const HistoryResponseSchema = z.object({
  history: z.array(SessionHistoryItemSchema),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await auth();
    if (!session?.user?.externalId) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const user = await prisma.user.findUnique({
      where: { externalId: session.user.externalId },
      select: { id: true },
    });

    if (!user) {
      return errorResponse('User not found', 'USER_NOT_FOUND', 404);
    }

    const currentSession = await prisma.speakingSession.findFirst({
      where: { id, userId: user.id, status: 'DONE' },
      select: { id: true, createdAt: true },
    });

    if (!currentSession) {
      return errorResponse('Session not found', 'SESSION_NOT_FOUND', 404);
    }

    const sessions = await prisma.speakingSession.findMany({
      where: {
        userId: user.id,
        status: 'DONE',
        pronunciationReport: { isNot: null },
        createdAt: { lte: currentSession.createdAt },
      },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_WINDOW,
      select: {
        id: true,
        createdAt: true,
        pronunciationReport: {
          select: {
            fluencyScore: true,
            accuracyScore: true,
            pronScore: true,
          },
        },
      },
    });

    const history = sessions
      .filter(
        (s): s is typeof s & { pronunciationReport: NonNullable<typeof s.pronunciationReport> } =>
          s.pronunciationReport !== null
      )
      .map((s) => ({
        sessionId: s.id,
        createdAt: s.createdAt.toISOString(),
        fluencyScore: s.pronunciationReport.fluencyScore,
        accuracyScore: s.pronunciationReport.accuracyScore,
        pronScore: s.pronunciationReport.pronScore,
      }))
      .reverse();

    const payload = HistoryResponseSchema.parse({ history });
    return successResponse(payload);
  } catch {
    return errorResponse('Failed to fetch pronunciation history', 'INTERNAL_ERROR', 500);
  }
}
