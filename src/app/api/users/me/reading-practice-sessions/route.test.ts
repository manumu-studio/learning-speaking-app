// Tests for GET /api/users/me/reading-practice-sessions — auth guard, pronunciation aggregation, and library data shape
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '@/__mocks__/prisma';

// Polyfill File for Node environment — route logic uses `instanceof File`
import { File as NodeFile } from 'buffer';
if (typeof File === 'undefined') {
  (globalThis as unknown as Record<string, unknown>).File = NodeFile;
}

// --- Module mocks ---
vi.mock('@/features/auth/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/db-utils', () => ({ findOrCreateUser: vi.fn(), hasConsent: vi.fn() }));
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));
vi.mock('@/lib/api', () => ({
  successResponse: (data: unknown, status = 200) => Response.json(data, { status }),
  errorResponse: (message: string, code: string, status: number) =>
    Response.json({ error: message, code }, { status }),
}));
vi.mock('@/lib/pronunciation/aggregatePhonemes', () => ({
  aggregatePhonemes: vi.fn().mockReturnValue([
    { phoneme: 'th', ipaSymbol: 'ð', averageScore: 55, occurrences: 3, exampleWords: ['the', 'this'] },
  ]),
}));

import { GET } from '@/app/api/users/me/reading-practice-sessions/route';
import { auth } from '@/features/auth/auth';
import { findOrCreateUser } from '@/lib/db-utils';
import { aggregatePhonemes } from '@/lib/pronunciation/aggregatePhonemes';

// --- Typed mock references ---
const mockAuth = vi.mocked(auth);
const mockFindOrCreateUser = vi.mocked(findOrCreateUser);
const mockAggregatePhonemes = vi.mocked(aggregatePhonemes);

// --- Fixtures ---
const mockAuthSession = {
  user: { externalId: 'ext-1', email: 'user@test.com', name: 'Test User' },
  expires: '',
};

const mockUser = {
  id: 'user-1',
  externalId: 'ext-1',
  email: 'user@test.com',
  displayName: 'Test User',
  onboardedAt: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

const mockSessionWithPronunciation = {
  id: 'session-1',
  intentLabel: 'Talking about travel',
  createdAt: new Date('2026-05-01T10:00:00Z'),
  pronunciationReport: {
    pronScore: 82,
    words: [
      {
        word: 'travel',
        accuracyScore: 90,
        errorType: 'None',
        phonemes: [{ phoneme: 'tr', accuracyScore: 88 }],
      },
      {
        word: 'the',
        accuracyScore: 45,
        errorType: 'Mispronunciation',
        phonemes: [{ phoneme: 'th', accuracyScore: 45 }],
      },
    ],
  },
  suggestedVocab: [
    { word: 'itinerary', meaning: 'A planned route or journey', firstUsedInSessionId: null },
    { word: 'destination', meaning: 'A place to which one travels', firstUsedInSessionId: 'session-2' },
  ],
};

function makeGetRequest(): Request {
  return new Request('http://localhost/api/users/me/reading-practice-sessions');
}

// --- Tests ---
describe('GET /api/users/me/reading-practice-sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore default mock for aggregatePhonemes after each test
    mockAggregatePhonemes.mockReturnValue([
      { phoneme: 'th', ipaSymbol: 'ð', averageScore: 55, occurrences: 3, exampleWords: ['the', 'this'] },
    ]);
  });

  it('returns 401 when not authenticated', async () => {
    // Arrange
    mockAuth.mockResolvedValue(null as never);

    // Act
    const response = await GET(makeGetRequest());
    const body = await response.json() as { error: string; code: string };

    // Assert
    expect(response.status).toBe(401);
    expect(body.code).toBe('UNAUTHORIZED');
    expect(mockFindOrCreateUser).not.toHaveBeenCalled();
  });

  it('returns sessions with pronunciation data and global weaknesses', async () => {
    // Arrange
    mockAuth.mockResolvedValue(mockAuthSession as never);
    mockFindOrCreateUser.mockResolvedValueOnce(mockUser as never);
    prismaMock.speakingSession.findMany.mockResolvedValueOnce([mockSessionWithPronunciation] as never);
    prismaMock.speakingSession.count.mockResolvedValueOnce(5); // 5 sessions before earliest
    prismaMock.vocabSuggestion.findMany.mockResolvedValueOnce([
      { word: 'itinerary', meaning: 'A planned route or journey' },
    ] as never);

    // Act
    const response = await GET(makeGetRequest());
    const body = await response.json() as {
      globalWeaknesses: { phonemes: unknown[]; unadoptedVocab: unknown[] };
      sessions: Array<{
        id: string;
        workoutNumber: number;
        intentLabel: string;
        pronScore: number | null;
        weakPhonemes: unknown[];
        mispronounced: unknown[];
        vocab: unknown[];
      }>;
    };

    // Assert
    expect(response.status).toBe(200);
    expect(body.sessions).toHaveLength(1);

    const session = body.sessions[0];
    expect(session).toBeDefined();
    expect(session?.id).toBe('session-1');
    expect(session?.intentLabel).toBe('Talking about travel');
    expect(session?.pronScore).toBe(82);
    expect(session?.workoutNumber).toBe(6); // 5 before + (1 - 0) = 6
    expect(session?.weakPhonemes).toHaveLength(1);
    expect(session?.mispronounced).toHaveLength(1); // only "the" (accuracy 45, errorType !== 'None')
    expect(session?.vocab).toHaveLength(2);

    // Global weaknesses
    expect(body.globalWeaknesses.phonemes).toHaveLength(1);
    expect(body.globalWeaknesses.unadoptedVocab).toHaveLength(1);

    // aggregatePhonemes called twice: once per-session, once global
    expect(mockAggregatePhonemes).toHaveBeenCalledTimes(2);
  });

  it('returns empty sessions array when user has no pronunciation data', async () => {
    // Arrange
    mockAuth.mockResolvedValue(mockAuthSession as never);
    mockFindOrCreateUser.mockResolvedValueOnce(mockUser as never);
    prismaMock.speakingSession.findMany.mockResolvedValueOnce([] as never);
    // count is NOT called when there are no sessions (earliestDate is undefined)
    prismaMock.vocabSuggestion.findMany.mockResolvedValueOnce([] as never);

    // Act
    const response = await GET(makeGetRequest());
    const body = await response.json() as {
      globalWeaknesses: { phonemes: unknown[]; unadoptedVocab: unknown[] };
      sessions: unknown[];
    };

    // Assert
    expect(response.status).toBe(200);
    expect(body.sessions).toHaveLength(0);
    expect(body.globalWeaknesses.phonemes).toBeDefined();
    expect(body.globalWeaknesses.unadoptedVocab).toHaveLength(0);

    // aggregatePhonemes still called for global aggregation (with empty array)
    expect(mockAggregatePhonemes).toHaveBeenCalledTimes(1);
    expect(prismaMock.speakingSession.count).not.toHaveBeenCalled();
  });
});
