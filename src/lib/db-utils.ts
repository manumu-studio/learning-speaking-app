// Database utility functions for common operations
import { prisma } from './prisma';
import type { User, SpeakingSession } from '@prisma/client';

/**
 * Find or create a user by external ID (from OAuth provider)
 */
export async function findOrCreateUser(
  externalId: string,
  data: { email?: string; displayName?: string }
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
      email: data.email,
      displayName: data.displayName,
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
): Promise<SpeakingSession[]> {
  return prisma.speakingSession.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    include: {
      transcript: true,
      insights: true,
    },
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
