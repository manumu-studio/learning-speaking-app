// Unit tests for POST /api/daily/conclude — auth, validation, and conclusion generation
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

import { POST } from './route';
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
  overallScore: 7.5,
  totalDurationSecs: 600,
  topicSentence: 'We covered job interviews and negotiation.',
  pillarScores: { delivery: 8.0, language: 7.2, pronunciation: 7.3 },
  metricDeltas: { delivery: 0.3, language: null, pronunciation: 0.1 },
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
  renderedFeedback: 'Solid output today! Keep building.',
  sessionCount: 2,
};

function makePostRequest(body: unknown): Request {
  return new Request('http://localhost/api/daily/conclude', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/daily/conclude', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);

    const response = await POST(makePostRequest({ date: '2026-06-01' }));
    const body = await response.json() as { code: string };

    expect(response.status).toBe(401);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('returns 400 when body is missing date', async () => {
    mockAuth.mockResolvedValue(mockSession as never);

    const response = await POST(makePostRequest({}));
    const body = await response.json() as { code: string };

    expect(response.status).toBe(400);
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when date format is invalid', async () => {
    mockAuth.mockResolvedValue(mockSession as never);

    const response = await POST(makePostRequest({ date: '01-06-2026' }));
    const body = await response.json() as { code: string };

    expect(response.status).toBe(400);
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 200 with cached conclusion on repeat call', async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    prismaMock.user.findUnique.mockResolvedValueOnce(mockUser as never);
    mockGenerateDailyConclusion.mockResolvedValueOnce({ id: 'cached-id', conclusionData: mockConclusionData });
    prismaMock.dailyConclusion.findUnique.mockResolvedValueOnce(mockConclusionRecord as never);

    const response = await POST(makePostRequest({ date: '2026-06-01' }));
    const body = await response.json() as {
      date: string;
      overallScore: number;
      deliveryAvg: number;
      sessionCount: number;
      renderedFeedback: string;
    };

    expect(response.status).toBe(200);
    expect(body.date).toBe('2026-06-01');
    expect(body.overallScore).toBe(7.5);
    expect(body.deliveryAvg).toBe(8.0);
    expect(body.sessionCount).toBe(2);
    expect(body.renderedFeedback).toBe('Solid output today! Keep building.');
    expect(mockGenerateDailyConclusion).toHaveBeenCalledTimes(1);
  });

  it('returns 200 with conclusion data on successful generation', async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    prismaMock.user.findUnique.mockResolvedValueOnce(mockUser as never);
    mockGenerateDailyConclusion.mockResolvedValueOnce({ id: 'conc-2', conclusionData: mockConclusionData });
    prismaMock.dailyConclusion.findUnique.mockResolvedValueOnce(mockConclusionRecord as never);

    const response = await POST(makePostRequest({ date: '2026-06-01' }));
    const body = await response.json() as {
      date: string;
      overallScore: number;
      deliveryAvg: number;
      sessionCount: number;
      renderedFeedback: string;
    };

    expect(response.status).toBe(200);
    expect(body.date).toBe('2026-06-01');
    expect(body.overallScore).toBe(7.5);
    expect(body.deliveryAvg).toBe(8.0);
    expect(body.sessionCount).toBe(2);
    expect(body.renderedFeedback).toBe('Solid output today! Keep building.');
  });
});
