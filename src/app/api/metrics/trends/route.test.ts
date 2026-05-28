// Tests for GET /api/metrics/trends — metric trends with Cache-Control
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { prismaMock } from '@/__mocks__/prisma';

vi.mock('@/features/auth/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));

import { auth } from '@/features/auth/auth';
import { GET } from './route';

const mockAuthSession = { user: { externalId: 'ext-1' } };
const mockUser = { id: 'user-1', externalId: 'ext-1' };

describe('GET /api/metrics/trends', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET returns Cache-Control header', async () => {
    vi.mocked(auth).mockResolvedValueOnce(mockAuthSession as never);
    prismaMock.user.findUnique.mockResolvedValueOnce(mockUser as never);
    prismaMock.metricSnapshot.findMany.mockResolvedValueOnce([]);

    const request = new NextRequest('http://localhost/api/metrics/trends?range=30d');
    const response = await GET(request);

    expect(response.headers.get('Cache-Control')).toBe(
      'private, max-age=30, stale-while-revalidate=60',
    );
  });
});
