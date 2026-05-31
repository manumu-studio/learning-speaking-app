// Tests for GET /api/sessions/[id]/personal-records — personal records with Cache-Control
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '@/__mocks__/prisma';
import { SessionStatus } from '@prisma/client';

vi.mock('@/features/auth/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/personalRecords', () => ({ detectPersonalRecords: vi.fn() }));

import { auth } from '@/features/auth/auth';
import { detectPersonalRecords } from '@/lib/personalRecords';
import { GET } from './route';

const mockAuthSession = { user: { externalId: 'ext-1' } };
const mockUser = { id: 'user-1', externalId: 'ext-1' };

describe('GET /api/sessions/[id]/personal-records', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET returns Cache-Control header', async () => {
    // auth is called twice per request (wrapper + handler)
    vi.mocked(auth).mockResolvedValue(mockAuthSession as never);
    prismaMock.user.findUnique.mockResolvedValueOnce(mockUser as never);
    prismaMock.speakingSession.findFirst.mockResolvedValueOnce({
      id: 'session-1',
      status: SessionStatus.DONE,
      createdAt: new Date('2026-01-15T10:00:00Z'),
    } as never);
    vi.mocked(detectPersonalRecords).mockResolvedValueOnce([]);

    const response = await GET(new Request('http://localhost/api/sessions/session-1/personal-records'), {
      params: Promise.resolve({ id: 'session-1' }),
    });

    expect(response.headers.get('Cache-Control')).toBe(
      'private, max-age=60, stale-while-revalidate=120',
    );
  });
});
