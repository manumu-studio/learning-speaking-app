// Tests for database utility functions — consent checking
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '@/__mocks__/prisma';
import { hasConsent } from './db-utils';

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
