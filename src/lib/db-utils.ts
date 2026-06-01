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

const DEFAULT_CONSENTS: Array<
  'AUDIO_STORAGE' | 'TRANSCRIPT_STORAGE' | 'PATTERN_TRACKING' | 'AI_DISCLOSURE'
> = [
  'AUDIO_STORAGE',
  'TRANSCRIPT_STORAGE',
  'PATTERN_TRACKING',
];

/**
 * Finds an existing user by OAuth external ID, or creates a new one with default consents.
 *
 * If the user already exists, `ensureConsents` is called to backfill any missing consent flags
 * introduced since account creation. Default consents: `AUDIO_STORAGE`, `TRANSCRIPT_STORAGE`,
 * `PATTERN_TRACKING`.
 *
 * @param externalId - The provider's stable user identifier (e.g. from the OIDC `sub` claim).
 * @param data - Optional `email` and `displayName` for new user creation.
 * @returns The Prisma `User` record (existing or newly created).
 */
export async function findOrCreateUser(
  externalId: string,
  data: { email?: string | undefined; displayName?: string | undefined }
): Promise<User> {
  const existing = await prisma.user.findUnique({
    where: { externalId },
  });

  if (existing) {
    await ensureConsents(existing.id);
    return existing;
  }

  return prisma.user.create({
    data: {
      externalId,
      ...(data.email !== undefined ? { email: data.email } : {}),
      ...(data.displayName !== undefined ? { displayName: data.displayName } : {}),
      consents: {
        create: DEFAULT_CONSENTS.map((flag) => ({ flag, granted: true })),
      },
    },
  });
}

async function ensureConsents(userId: string): Promise<void> {
  const existing = await prisma.userConsent.findMany({
    where: { userId },
    select: { flag: true },
  });
  const existingFlags = new Set(existing.map((c) => c.flag));
  const missing = DEFAULT_CONSENTS.filter((f) => !existingFlags.has(f));

  if (missing.length > 0) {
    await prisma.userConsent.createMany({
      data: missing.map((flag) => ({ userId, flag, granted: true })),
      skipDuplicates: true,
    });
  }
}

/**
 * Returns a paginated list of the user's speaking sessions, ordered newest-first.
 *
 * @param userId - Internal user ID.
 * @param limit - Maximum number of sessions to return (defaults to 10).
 * @param offset - Number of sessions to skip for pagination (defaults to 0).
 * @returns An array of `UserSessionListItem` objects (may be empty).
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
 * Returns `true` if the user has an active (non-revoked) consent for the given flag.
 *
 * @param userId - Internal user ID.
 * @param flag - The consent flag to check.
 * @returns `true` when the consent row exists, `granted` is `true`, and `revokedAt` is `null`.
 */
export async function hasConsent(
  userId: string,
  flag: 'AUDIO_STORAGE' | 'TRANSCRIPT_STORAGE' | 'PATTERN_TRACKING' | 'AI_DISCLOSURE'
): Promise<boolean> {
  const consent = await prisma.userConsent.findUnique({
    where: {
      userId_flag: { userId, flag },
    },
  });

  return consent?.granted === true && consent.revokedAt === null;
}
