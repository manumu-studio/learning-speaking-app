// Unit tests for GET /api/daily/[date] — auth, validation, and conclusion fetch/generation
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '@/__mocks__/prisma';

vi.mock('@/lib/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://test',
    NEXTAUTH_SECRET: 'test-secret-32-chars-long-minimum!!',
    NEXTAUTH_URL: 'http://localhost:3000',
    AUTH_CLIENT_ID: 'test-client-id',
    AUTH_CLIENT_SECRET: 'test-client-secret',
    NODE_ENV: 'test',
    AUTH_ISSUER_URL: 'https://auth.manumustudio.com',
    APP_URL: 'http://localhost:3000',
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: vi.fn().mockReturnThis() },
}));
vi.mock('@/features/auth/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/daily', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/daily')>();
  return { ...actual, generateDailyConclusion: vi.fn() };
});
vi.mock('@/lib/observability', () => ({
  withObservability: (h: (req: Request, ctx: unknown) => Promise<Response>) => h,
}));

import { GET } from './route';
import { auth } from '@/features/auth/auth';
import { generateDailyConclusion } from '@/lib/daily';

const mockAuth = vi.mocked(auth);
const mockGenerateDailyConclusion = vi.mocked(generateDailyConclusion);

const mockSession = {
  user: { externalId: 'ext-1', email: 'user@test.com', name: 'Test User' },
  expires: '',
};

const mockUser = { id: 'user-1' };

const mockConclusionData = {
  date: '2026-06-01',
  overallScore: 7.2,
  totalDurationSecs: 720,
  topicSentence: 'We worked through presentation skills.',
  pillarScores: { delivery: 7.5, language: 7.8, pronunciation: 6.3 },
  metricDeltas: { delivery: 0.5, language: null, pronunciation: -0.2 },
  wins: [],
  struggles: [],
  persistentStruggles: [],
  improvedSinceYesterday: [],
  newVocabSpotted: [],
  focusTomorrow: [],
  activeTargetsTomorrow: [],
  keyInsights: [],
  tone: 'supportive_neutral' as const,
};

const mockConclusionRecord = {
  renderedFeedback: 'Strong session today! Great delivery.',
  sessionCount: 3,
};

function makeRequest(date: string): Request {
  return new Request(`http://localhost/api/daily/${date}`);
}

function makeRouteCtx(date: string) {
  return { params: Promise.resolve({ date }) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/daily/[date]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);

    const response = await GET(makeRequest('2026-06-01'), makeRouteCtx('2026-06-01'));
    const body = await response.json() as { code: string };

    expect(response.status).toBe(401);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('returns 400 when date param is invalid', async () => {
    mockAuth.mockResolvedValue(mockSession as never);

    const response = await GET(makeRequest('06-01-2026'), makeRouteCtx('06-01-2026'));
    const body = await response.json() as { code: string };

    expect(response.status).toBe(400);
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 when no sessions exist for the date', async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    prismaMock.user.findUnique.mockResolvedValueOnce(mockUser as never);
    mockGenerateDailyConclusion.mockResolvedValueOnce(null);

    const response = await GET(makeRequest('2026-06-01'), makeRouteCtx('2026-06-01'));
    const body = await response.json() as { code: string };

    expect(response.status).toBe(404);
    expect(body.code).toBe('NO_SESSIONS');
  });

  it('returns 200 with cached conclusion (no regeneration)', async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    prismaMock.user.findUnique.mockResolvedValueOnce(mockUser as never);
    mockGenerateDailyConclusion.mockResolvedValueOnce({ id: 'cached-id', conclusionData: mockConclusionData });
    prismaMock.dailyConclusion.findUnique.mockResolvedValueOnce(mockConclusionRecord as never);

    const response = await GET(makeRequest('2026-06-01'), makeRouteCtx('2026-06-01'));
    const body = await response.json() as {
      date: string;
      overallScore: number;
      deliveryAvg: number;
      languageAvg: number;
      pronunciationAvg: number;
      sessionCount: number;
      renderedFeedback: string;
      conclusionData: typeof mockConclusionData;
    };

    expect(response.status).toBe(200);
    expect(body.date).toBe('2026-06-01');
    expect(body.overallScore).toBe(7.2);
    expect(body.sessionCount).toBe(3);
    expect(body.renderedFeedback).toBe('Strong session today! Great delivery.');
    expect(mockGenerateDailyConclusion).toHaveBeenCalledTimes(1);
  });

  it('returns 200 with conclusion data when sessions exist', async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    prismaMock.user.findUnique.mockResolvedValueOnce(mockUser as never);
    mockGenerateDailyConclusion.mockResolvedValueOnce({ id: 'conc-1', conclusionData: mockConclusionData });
    prismaMock.dailyConclusion.findUnique.mockResolvedValueOnce(mockConclusionRecord as never);

    const response = await GET(makeRequest('2026-06-01'), makeRouteCtx('2026-06-01'));
    const body = await response.json() as {
      date: string;
      overallScore: number;
      deliveryAvg: number;
      languageAvg: number;
      pronunciationAvg: number;
      sessionCount: number;
      renderedFeedback: string;
      conclusionData: typeof mockConclusionData;
    };

    expect(response.status).toBe(200);
    expect(body.date).toBe('2026-06-01');
    expect(body.overallScore).toBe(7.2);
    expect(body.deliveryAvg).toBe(7.5);
    expect(body.languageAvg).toBe(7.8);
    expect(body.pronunciationAvg).toBe(6.3);
    expect(body.sessionCount).toBe(3);
    expect(body.renderedFeedback).toBe('Strong session today! Great delivery.');
    expect(body.conclusionData).toEqual(mockConclusionData);
  });
});
