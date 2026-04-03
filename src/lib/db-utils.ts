// Database utility functions for common operations
import { prisma } from './prisma';
import type { Prisma, User } from '@prisma/client';

const userSessionListSelect = {
  id: true,
  status: true,
  durationSecs: true,
  language: true,
  topic: true,
  intentLabel: true,
  summary: true,
  createdAt: true,
  updatedAt: true,
  focusMetricKey: true,
  focusNext: true,
  _count: {
    select: {
      insights: true,
    },
  },
} satisfies Prisma.SpeakingSessionSelect;

export type UserSessionListItem = Prisma.SpeakingSessionGetPayload<{
  select: typeof userSessionListSelect;
}>;

/**
 * Find or create a user by external ID (from OAuth provider)
 */
export async function findOrCreateUser(
  externalId: string,
  data: { email?: string | undefined; displayName?: string | undefined }
): Promise<User> {
  const existing = await prisma.user.findUnique({
    where: { externalId },
  });

  if (existing) {
    return existing;
  }

  return prisma.user.create({
    data: {
      externalId,
      ...(data.email !== undefined ? { email: data.email } : {}),
      ...(data.displayName !== undefined ? { displayName: data.displayName } : {}),
    },
  });
}

/**
 * Get user's recent sessions with pagination
 */
export async function getUserSessions(
  userId: string,
  limit = 10,
  offset = 0
): Promise<UserSessionListItem[]> {
  return prisma.speakingSession.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    select: userSessionListSelect,
  });
}

/**
 * Check if user has granted a specific consent
 */
export async function hasConsent(
  userId: string,
  flag: 'AUDIO_STORAGE' | 'TRANSCRIPT_STORAGE' | 'PATTERN_TRACKING'
): Promise<boolean> {
  const consent = await prisma.userConsent.findUnique({
    where: {
      userId_flag: { userId, flag },
    },
  });

  return consent?.granted === true && consent.revokedAt === null;
}
