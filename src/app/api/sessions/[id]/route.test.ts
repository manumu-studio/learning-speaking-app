// Tests for GET /api/sessions/[id] — session detail fetch with Cache-Control
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '@/__mocks__/prisma';
import { SessionStatus } from '@prisma/client';

vi.mock('@/features/auth/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/storage/r2', () => ({ deleteAudio: vi.fn(), uploadAudio: vi.fn(), generateAudioKey: vi.fn() }));
vi.mock('@/lib/csrf', () => ({ validateOrigin: vi.fn().mockReturnValue(true), csrfForbiddenResponse: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

import { auth } from '@/features/auth/auth';
import { GET } from './route';

const mockAuthSession = { user: { externalId: 'ext-1' } };
const mockUser = { id: 'user-1', externalId: 'ext-1' };

const mockSpeakingSession = {
  id: 'session-1',
  userId: 'user-1',
  status: SessionStatus.DONE,
  createdAt: new Date('2026-01-15T10:00:00Z'),
  transcript: null,
  insights: [],
  metrics: [],
  pronunciationReport: null,
  chunks: [],
};

describe('GET /api/sessions/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET returns Cache-Control header', async () => {
    vi.mocked(auth).mockResolvedValueOnce(mockAuthSession as never);
    prismaMock.user.findUnique.mockResolvedValueOnce(mockUser as never);
    prismaMock.speakingSession.findFirst.mockResolvedValueOnce(mockSpeakingSession as never);
    prismaMock.speakingSession.count.mockResolvedValueOnce(1);

    const response = await GET(new Request('http://localhost/api/sessions/session-1'), {
      params: Promise.resolve({ id: 'session-1' }),
    });

    expect(response.headers.get('Cache-Control')).toBe(
      'private, max-age=60, stale-while-revalidate=120',
    );
  });
});
