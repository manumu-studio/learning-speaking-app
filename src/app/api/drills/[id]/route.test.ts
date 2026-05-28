// Tests for GET /api/drills/[id] — drill detail fetch with Cache-Control
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '@/__mocks__/prisma';

vi.mock('@/features/auth/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/db-utils', () => ({ findOrCreateUser: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

import { auth } from '@/features/auth/auth';
import { findOrCreateUser } from '@/lib/db-utils';
import { GET } from './route';

const mockAuthSession = { user: { externalId: 'ext-1', email: 'test@test.com', name: 'Test' } };
const mockUser = { id: 'user-1', externalId: 'ext-1' };

const mockDrill = {
  id: 'drill-1',
  userId: 'user-1',
  sessionId: 'session-1',
  drillType: 'rephrase',
  metricKey: 'connectorRepetition',
  prompt: 'Rephrase this',
  sourceExample: 'Example',
  transcript: null,
  feedback: null,
  improved: null,
  createdAt: new Date('2026-01-15T10:00:00Z'),
  completedAt: null,
};

describe('GET /api/drills/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET returns Cache-Control header', async () => {
    vi.mocked(auth).mockResolvedValueOnce(mockAuthSession as never);
    vi.mocked(findOrCreateUser).mockResolvedValueOnce(mockUser as never);
    prismaMock.drillAttempt.findUnique.mockResolvedValueOnce(mockDrill as never);

    const response = await GET(new Request('http://localhost/api/drills/drill-1'), {
      params: Promise.resolve({ id: 'drill-1' }),
    });

    expect(response.headers.get('Cache-Control')).toBe(
      'private, max-age=60, stale-while-revalidate=120',
    );
  });
});
