// Unit tests for GET /api/users/me/daily-summaries — auth, validation, caching, and summary computation
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '@/__mocks__/prisma';

vi.mock('@/features/auth/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/ai/generateDailyFeedback', () => ({ generateDailyFeedback: vi.fn() }));
vi.mock('@/lib/observability', () => ({
  withObservability: (handler: (req: Request, ctx: unknown) => Promise<Response>) =>
    (req: Request) =>
      handler(req, {
        logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
        requestId: 'test-request-id',
      }),
  getRequestId: vi.fn().mockReturnValue('test-request-id'),
  withRequestId: vi.fn((_id: string, fn: () => unknown) => fn()),
}));
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));

import { GET } from './route';
import { auth } from '@/features/auth/auth';
import { generateDailyFeedback } from '@/lib/ai/generateDailyFeedback';

const mockAuth = vi.mocked(auth);
const mockGenerateDailyFeedback = vi.mocked(generateDailyFeedback);

const mockSession = {
  user: { externalId: 'ext-1', email: 'user@test.com', name: 'Test User' },
  expires: '',
};

const mockUser = { id: 'user-1' };

function makeRequest(date?: string): Request {
  const url = date
    ? `http://localhost/api/users/me/daily-summaries?date=${date}`
    : 'http://localhost/api/users/me/daily-summaries';
  return new Request(url);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/users/me/daily-summaries', () => {
  it('returns 401 for unauthenticated requests', async () => {
    mockAuth.mockResolvedValue(null as never);

    const response = await GET(makeRequest('2026-06-01'));
    const body = await response.json() as { code: string };

    expect(response.status).toBe(401);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('returns 400 for missing date query param', async () => {
    mockAuth.mockResolvedValue(mockSession as never);

    const response = await GET(makeRequest());
    const body = await response.json() as { code: string };

    expect(response.status).toBe(400);
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for invalid date format', async () => {
    mockAuth.mockResolvedValue(mockSession as never);

    const response = await GET(makeRequest('06-01-2026'));
    const body = await response.json() as { code: string };

    expect(response.status).toBe(400);
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('returns cached summary if one exists', async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    prismaMock.user.findUnique.mockResolvedValueOnce(mockUser as never);

    const cachedSummary = {
      userId: 'user-1',
      date: new Date('2026-06-01T00:00:00.000Z'),
      deliveryAvg: 7.5,
      languageAvg: 6.8,
      pronunciationAvg: 7.2,
      newWords: ['articulate', 'eloquent'],
      feedback: 'Great delivery today!',
      sessionCount: 2,
    };
    prismaMock.dailySummary.findUnique.mockResolvedValueOnce(cachedSummary as never);

    const response = await GET(makeRequest('2026-06-01'));
    const body = await response.json() as { deliveryAvg: number; feedback: string };

    expect(response.status).toBe(200);
    expect(body.deliveryAvg).toBe(7.5);
    expect(body.feedback).toBe('Great delivery today!');
    // generateDailyFeedback should NOT be called when cache hit
    expect(mockGenerateDailyFeedback).not.toHaveBeenCalled();
  });

  it('returns 404 when no completed sessions exist for the date', async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    prismaMock.user.findUnique.mockResolvedValueOnce(mockUser as never);
    prismaMock.dailySummary.findUnique.mockResolvedValueOnce(null as never);
    prismaMock.speakingSession.findMany.mockResolvedValueOnce([] as never);

    const response = await GET(makeRequest('2026-06-01'));
    const body = await response.json() as { code: string };

    expect(response.status).toBe(404);
    expect(body.code).toBe('NO_SESSIONS');
  });

  it('computes and caches summary when no cache exists', async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    prismaMock.user.findUnique.mockResolvedValueOnce(mockUser as never);
    prismaMock.dailySummary.findUnique.mockResolvedValueOnce(null as never);
    prismaMock.speakingSession.findMany.mockResolvedValueOnce([
      { id: 'sess-1' },
      { id: 'sess-2' },
    ] as never);
    prismaMock.metricSnapshot.findMany.mockResolvedValueOnce([
      { key: 'speakingRate', score: 7 },
      { key: 'fillerUsage', score: 8 },
      { key: 'connectorRepetition', score: 6 },
      { key: 'pronunciationAccuracy', score: 9 },
    ] as never);
    prismaMock.vocabSuggestion.findMany.mockResolvedValueOnce([
      { word: 'succinct' },
    ] as never);
    mockGenerateDailyFeedback.mockResolvedValueOnce('Solid session, keep it up!');
    prismaMock.dailySummary.create.mockResolvedValueOnce({} as never);

    const response = await GET(makeRequest('2026-06-01'));
    const body = await response.json() as { sessionCount: number; feedback: string };

    expect(response.status).toBe(200);
    expect(body.sessionCount).toBe(2);
    expect(body.feedback).toBe('Solid session, keep it up!');
    expect(prismaMock.dailySummary.create).toHaveBeenCalledOnce();
  });

  it('calls generateDailyFeedback with correct pillar averages', async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    prismaMock.user.findUnique.mockResolvedValueOnce(mockUser as never);
    prismaMock.dailySummary.findUnique.mockResolvedValueOnce(null as never);
    prismaMock.speakingSession.findMany.mockResolvedValueOnce([{ id: 'sess-1' }] as never);
    // delivery keys: speakingRate, fillerUsage, argumentClosure
    // language keys: connectorRepetition, structuralVariety, vocabularyPrecision, verbAccuracy, lexicalSophistication, registerPragmatics
    // pronunciation keys: pronunciationAccuracy, prosodyScore
    prismaMock.metricSnapshot.findMany.mockResolvedValueOnce([
      { key: 'speakingRate', score: 8 },
      { key: 'fillerUsage', score: 6 },
      { key: 'connectorRepetition', score: 7 },
      { key: 'pronunciationAccuracy', score: 9 },
      { key: 'prosodyScore', score: 7 },
    ] as never);
    prismaMock.vocabSuggestion.findMany.mockResolvedValueOnce([] as never);
    mockGenerateDailyFeedback.mockResolvedValueOnce('Keep pushing!');
    prismaMock.dailySummary.create.mockResolvedValueOnce({} as never);

    await GET(makeRequest('2026-06-01'));

    expect(mockGenerateDailyFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionCount: 1,
        deliveryAvg: expect.any(Number) as number,
        languageAvg: expect.any(Number) as number,
        pronunciationAvg: expect.any(Number) as number,
      }),
    );

    const callArg = mockGenerateDailyFeedback.mock.calls[0]?.[0];
    // delivery avg = mean(8, 6) = 7.0
    expect(callArg?.deliveryAvg).toBe(7);
    // pronunciation avg = mean(9, 7) = 8.0
    expect(callArg?.pronunciationAvg).toBe(8);
  });

  it('fetches up to 3 new vocab words for the day', async () => {
    mockAuth.mockResolvedValue(mockSession as never);
    prismaMock.user.findUnique.mockResolvedValueOnce(mockUser as never);
    prismaMock.dailySummary.findUnique.mockResolvedValueOnce(null as never);
    prismaMock.speakingSession.findMany.mockResolvedValueOnce([{ id: 'sess-1' }] as never);
    prismaMock.metricSnapshot.findMany.mockResolvedValueOnce([
      { key: 'speakingRate', score: 7 },
    ] as never);
    prismaMock.vocabSuggestion.findMany.mockResolvedValueOnce([
      { word: 'articulate' },
      { word: 'eloquent' },
      { word: 'succinct' },
    ] as never);
    mockGenerateDailyFeedback.mockResolvedValueOnce('Nice vocab gains!');
    prismaMock.dailySummary.create.mockResolvedValueOnce({} as never);

    const response = await GET(makeRequest('2026-06-01'));
    const body = await response.json() as { newWords: string[] };

    expect(response.status).toBe(200);
    expect(body.newWords).toEqual(['articulate', 'eloquent', 'succinct']);

    // Confirm the take: 3 constraint was used
    expect(prismaMock.vocabSuggestion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 3 }),
    );
  });

  it('uses withObservability wrapper — GET export exists as a function', () => {
    // withObservability returns a wrapped RouteHandler; the named export must exist
    expect(typeof GET).toBe('function');
  });
});
