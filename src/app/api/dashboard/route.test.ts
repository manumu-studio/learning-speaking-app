// Tests for GET /api/dashboard — auth guard, user lookup, and data aggregation
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '@/__mocks__/prisma';

// --- Mocks ---

vi.mock('@/features/auth/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/features/dashboard/getDashboardData', () => ({ getDashboardData: vi.fn() }));

import { auth } from '@/features/auth/auth';
import { getDashboardData } from '@/features/dashboard/getDashboardData';
import { GET } from './route';

// --- Fixtures ---

const mockSession = {
  user: { externalId: 'ext-1', email: 'user@test.com', name: 'Test User' },
};

const mockUser = { id: 'user-1' };

const mockDashboardData = {
  weeklyMinutes: 45,
  weeklySessionCount: 3,
  totalSessions: 12,
  currentStreak: 4,
  metrics: [],
  recentSessions: [],
  drillStats: {
    totalCompleted: 10,
    weeklyCompleted: 3,
    improvementRate: 70,
    byMetric: {},
  },
};

// --- Tests ---

describe('GET /api/dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue(null as never);

    // Act
    const response = await GET();

    // Assert
    expect(response.status).toBe(401);
    const body = await response.json() as { error: string };
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 when session exists but externalId is missing', async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({ user: {} } as never);

    // Act
    const response = await GET();

    // Assert
    expect(response.status).toBe(401);
    const body = await response.json() as { error: string };
    expect(body.error).toBe('Unauthorized');
    expect(getDashboardData).not.toHaveBeenCalled();
  });

  it('returns 401 when authenticated user is not found in the database', async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    prismaMock.user.findUnique.mockResolvedValue(null);

    // Act
    const response = await GET();

    // Assert
    expect(response.status).toBe(401);
    const body = await response.json() as { error: string };
    expect(body.error).toBe('Unauthorized');
    expect(getDashboardData).not.toHaveBeenCalled();
  });

  it('returns 200 with dashboard data for a valid authenticated user', async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    prismaMock.user.findUnique.mockResolvedValue(mockUser as never);
    vi.mocked(getDashboardData).mockResolvedValue(mockDashboardData as never);

    // Act
    const response = await GET();

    // Assert
    expect(response.status).toBe(200);
    const body = await response.json() as typeof mockDashboardData;
    expect(body.weeklyMinutes).toBe(45);
    expect(body.currentStreak).toBe(4);
    expect(body.totalSessions).toBe(12);
    expect(getDashboardData).toHaveBeenCalledWith('user-1');
  });

  it('returns Cache-Control header', async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    prismaMock.user.findUnique.mockResolvedValue(mockUser as never);
    vi.mocked(getDashboardData).mockResolvedValue(mockDashboardData as never);

    const response = await GET();

    expect(response.headers.get('Cache-Control')).toBe(
      'private, max-age=30, stale-while-revalidate=60',
    );
  });

  it('propagates unhandled errors from getDashboardData', async () => {
    // Arrange — handler has no try/catch, so errors bubble up
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    prismaMock.user.findUnique.mockResolvedValue(mockUser as never);
    vi.mocked(getDashboardData).mockRejectedValue(new Error('DB timeout'));

    // Act & Assert
    await expect(GET()).rejects.toThrow('DB timeout');
  });
});
