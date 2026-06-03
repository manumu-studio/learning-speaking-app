// Tests for database utility functions — consent checking, user creation, and session listing
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '@/__mocks__/prisma';
import { hasConsent, findOrCreateUser, getUserSessions } from './db-utils';

vi.mock('./prisma', () => ({ prisma: prismaMock }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('hasConsent', () => {
  it('returns true when user has active consent', async () => {
    prismaMock.userConsent.findUnique.mockResolvedValueOnce({
      id: 'consent-1',
      userId: 'user-1',
      flag: 'AUDIO_STORAGE',
      granted: true,
      grantedAt: new Date(),
      revokedAt: null,
    });

    const result = await hasConsent('user-1', 'AUDIO_STORAGE');
    expect(result).toBe(true);
  });

  it('returns false when consent has been revoked', async () => {
    prismaMock.userConsent.findUnique.mockResolvedValueOnce({
      id: 'consent-1',
      userId: 'user-1',
      flag: 'AUDIO_STORAGE',
      granted: true,
      grantedAt: new Date(),
      revokedAt: new Date(),
    });

    const result = await hasConsent('user-1', 'AUDIO_STORAGE');
    expect(result).toBe(false);
  });

  it('returns false when no consent record exists', async () => {
    prismaMock.userConsent.findUnique.mockResolvedValueOnce(null);

    const result = await hasConsent('user-1', 'AUDIO_STORAGE');
    expect(result).toBe(false);
  });
});

// ─── findOrCreateUser ─────────────────────────────────────────────────────────

const mockUser = {
  id: 'user-1',
  externalId: 'ext-1',
  email: 'test@test.com',
  displayName: 'Test User',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('findOrCreateUser', () => {
  it('returns existing user and calls ensureConsents when user already exists', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(mockUser as never);
    prismaMock.userConsent.findMany.mockResolvedValueOnce([
      { flag: 'AUDIO_STORAGE' },
      { flag: 'TRANSCRIPT_STORAGE' },
      { flag: 'PATTERN_TRACKING' },
    ] as never);

    const result = await findOrCreateUser('ext-1', { email: 'test@test.com' });

    expect(result).toEqual(mockUser);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it('creates a new user with default consents when user does not exist', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null as never);
    prismaMock.user.create.mockResolvedValueOnce(mockUser as never);

    const result = await findOrCreateUser('ext-new', { email: 'new@test.com', displayName: 'New User' });

    expect(result).toEqual(mockUser);
    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ externalId: 'ext-new', email: 'new@test.com' }),
      }),
    );
  });

  it('backfills missing consents for existing users', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(mockUser as never);
    // Only has AUDIO_STORAGE — missing TRANSCRIPT_STORAGE and PATTERN_TRACKING
    prismaMock.userConsent.findMany.mockResolvedValueOnce([
      { flag: 'AUDIO_STORAGE' },
    ] as never);
    prismaMock.userConsent.createMany.mockResolvedValueOnce({ count: 2 } as never);

    await findOrCreateUser('ext-1', {});

    expect(prismaMock.userConsent.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ flag: 'TRANSCRIPT_STORAGE' }),
          expect.objectContaining({ flag: 'PATTERN_TRACKING' }),
        ]),
      }),
    );
  });
});

// ─── getUserSessions ──────────────────────────────────────────────────────────

describe('getUserSessions', () => {
  it('returns sessions for a user with default limit and offset', async () => {
    const mockSessions = [
      { id: 'session-1', status: 'DONE', durationSecs: 90, intentLabel: 'Interview prep' },
    ];
    prismaMock.speakingSession.findMany.mockResolvedValueOnce(mockSessions as never);

    const result = await getUserSessions('user-1');

    expect(result).toEqual(mockSessions);
    expect(prismaMock.speakingSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' }, take: 10, skip: 0 }),
    );
  });

  it('applies custom limit and offset', async () => {
    prismaMock.speakingSession.findMany.mockResolvedValueOnce([] as never);

    await getUserSessions('user-1', 5, 20);

    expect(prismaMock.speakingSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5, skip: 20 }),
    );
  });

  it('returns empty array when user has no sessions', async () => {
    prismaMock.speakingSession.findMany.mockResolvedValueOnce([] as never);

    const result = await getUserSessions('user-1');

    expect(result).toEqual([]);
  });
});
