// Tests for GET /api/sessions/[id]/focus-comparison — focus metric comparison endpoint
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '@/__mocks__/prisma';

// --- Mocks ---

vi.mock('@/features/auth/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/metric-keys', () => ({ isSpeakingMetricKey: vi.fn() }));

import { auth } from '@/features/auth/auth';
import { isSpeakingMetricKey } from '@/lib/metric-keys';
import { GET } from '@/app/api/sessions/[id]/focus-comparison/route';

const mockedAuth = vi.mocked(auth);
const mockedIsMetricKey = vi.mocked(isSpeakingMetricKey);

// --- Fixtures ---

const SESSION_ID = 'session-1';
const METRIC_KEY = 'connectorRepetition';

const mockAuthSession = { user: { externalId: 'ext-1' } };
const mockUser = { id: 'user-1', externalId: 'ext-1' };
const mockSession = {
  id: SESSION_ID,
  userId: 'user-1',
  focusMetricKey: METRIC_KEY,
  createdAt: new Date('2026-01-15T10:00:00Z'),
};
const mockMetric = { score: 7 };

// --- Helpers ---

function makeRequest(metricKey?: string): Request {
  const url = metricKey
    ? `http://localhost/api/sessions/${SESSION_ID}/focus-comparison?metricKey=${metricKey}`
    : `http://localhost/api/sessions/${SESSION_ID}/focus-comparison`;
  return new Request(url);
}

function makeParams(id = SESSION_ID): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

// --- Tests ---

describe('GET /api/sessions/[id]/focus-comparison', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when metricKey param is missing', async () => {
    // Arrange
    mockedIsMetricKey.mockReturnValue(false);

    // Act
    const response = await GET(makeRequest(), makeParams());
    const body = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(body).toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('returns 401 when user is not authenticated', async () => {
    // Arrange
    mockedIsMetricKey.mockReturnValue(true);
    mockedAuth.mockResolvedValueOnce(null as never);

    // Act
    const response = await GET(makeRequest(METRIC_KEY), makeParams());
    const body = await response.json();

    // Assert
    expect(response.status).toBe(401);
    expect(body).toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('returns 404 when session does not belong to the user', async () => {
    // Arrange
    mockedIsMetricKey.mockReturnValue(true);
    mockedAuth.mockResolvedValueOnce(mockAuthSession as never);
    prismaMock.user.findUnique.mockResolvedValueOnce(mockUser as never);
    prismaMock.speakingSession.findFirst.mockResolvedValueOnce(null);

    // Act
    const response = await GET(makeRequest(METRIC_KEY), makeParams());
    const body = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(body).toMatchObject({ code: 'SESSION_NOT_FOUND' });
  });

  it('returns currentScore and previousScore when a prior focus session exists', async () => {
    // Arrange
    mockedIsMetricKey.mockReturnValue(true);
    mockedAuth.mockResolvedValueOnce(mockAuthSession as never);
    prismaMock.user.findUnique.mockResolvedValueOnce(mockUser as never);
    // First findFirst → current session
    prismaMock.speakingSession.findFirst.mockResolvedValueOnce(mockSession as never);
    // Current metric snapshot
    prismaMock.metricSnapshot.findFirst.mockResolvedValueOnce(mockMetric as never);
    // Previous session
    prismaMock.speakingSession.findFirst.mockResolvedValueOnce({ id: 'session-0' } as never);
    // Previous metric snapshot
    prismaMock.metricSnapshot.findFirst.mockResolvedValueOnce({ score: 5 } as never);

    // Act
    const response = await GET(makeRequest(METRIC_KEY), makeParams());
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body).toEqual({ currentScore: 7, previousScore: 5 });
  });

  it('returns previousScore as null when no prior focus session exists', async () => {
    // Arrange
    mockedIsMetricKey.mockReturnValue(true);
    mockedAuth.mockResolvedValueOnce(mockAuthSession as never);
    prismaMock.user.findUnique.mockResolvedValueOnce(mockUser as never);
    prismaMock.speakingSession.findFirst.mockResolvedValueOnce(mockSession as never);
    prismaMock.metricSnapshot.findFirst.mockResolvedValueOnce(mockMetric as never);
    // No previous session found
    prismaMock.speakingSession.findFirst.mockResolvedValueOnce(null);

    // Act
    const response = await GET(makeRequest(METRIC_KEY), makeParams());
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body).toEqual({ currentScore: 7, previousScore: null });
  });

  it('returns 403 when session focusMetricKey does not match the requested metricKey', async () => {
    // Arrange
    mockedIsMetricKey.mockReturnValue(true);
    mockedAuth.mockResolvedValueOnce(mockAuthSession as never);
    prismaMock.user.findUnique.mockResolvedValueOnce(mockUser as never);
    prismaMock.speakingSession.findFirst.mockResolvedValueOnce({
      ...mockSession,
      focusMetricKey: 'verbAccuracy', // mismatched key
    } as never);

    // Act
    const response = await GET(makeRequest(METRIC_KEY), makeParams());
    const body = await response.json();

    // Assert
    expect(response.status).toBe(403);
    expect(body).toMatchObject({ code: 'FORBIDDEN' });
  });
});
