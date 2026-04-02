// Tests for drill recommendation logic — metric selection and fallback behavior
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Prisma } from '@prisma/client';
import { prismaMock } from '@/__mocks__/prisma';
import { recommendDrill } from './recommendDrill';
import { generateDrill } from './generateDrill';

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));

vi.mock('./generateDrill', () => ({
  generateDrill: vi.fn(),
}));

type RecommendSession = Prisma.SpeakingSessionGetPayload<{
  select: {
    id: true;
    focusMetricKey: true;
    intentLabel: true;
    transcript: { select: { text: true } };
    insights: { select: { pattern: true; detail: true; examples: true } };
    metrics: { select: { key: true; score: true } };
  };
}>;

function mockSession(overrides: Partial<RecommendSession> = {}): RecommendSession {
  return {
    id: 'session-1',
    focusMetricKey: null,
    intentLabel: 'Daily routine discussion',
    transcript: { text: 'I went to the store so I bought some things.' },
    insights: [
      {
        pattern: 'Overuses "so"',
        detail: 'Connector repetition',
        examples: ['so I went', 'so I did'],
      },
    ],
    metrics: [
      { key: 'connectorRepetition', score: 3 },
      { key: 'structuralVariety', score: 5 },
      { key: 'vocabularyPrecision', score: 7 },
      { key: 'verbAccuracy', score: 6 },
      { key: 'argumentClosure', score: 4 },
      { key: 'fillerUsage', score: 8 },
    ],
    ...overrides,
  };
}

const defaultDrillReturn = {
  drillType: 'rephrase' as const,
  metricKey: 'connectorRepetition',
  prompt: 'Try using "however" instead.',
  sourceExample: 'I was tired so I left',
  timeLimit: 90,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(generateDrill).mockResolvedValue(defaultDrillReturn);
});

describe('recommendDrill', () => {
  it('targets the focus metric when focusMetricKey is set', async () => {
    prismaMock.speakingSession.findUnique.mockResolvedValueOnce(
      mockSession({ focusMetricKey: 'vocabularyPrecision' }) as never
    );

    await recommendDrill('session-1');

    expect(generateDrill).toHaveBeenCalledWith(
      expect.objectContaining({
        drillType: 'vocabUpgrade',
        metricKey: 'vocabularyPrecision',
      })
    );
  });

  it('targets the lowest-scoring metric when no focus is set', async () => {
    prismaMock.speakingSession.findUnique.mockResolvedValueOnce(mockSession({ focusMetricKey: null }) as never);

    await recommendDrill('session-1');

    expect(generateDrill).toHaveBeenCalledWith(
      expect.objectContaining({
        drillType: 'rephrase',
        metricKey: 'connectorRepetition',
      })
    );
  });

  it('returns a drill even when all metrics have equal scores', async () => {
    const equalMetrics = [
      { key: 'connectorRepetition', score: 5 },
      { key: 'structuralVariety', score: 5 },
      { key: 'vocabularyPrecision', score: 5 },
      { key: 'verbAccuracy', score: 5 },
      { key: 'argumentClosure', score: 5 },
      { key: 'fillerUsage', score: 5 },
    ];
    prismaMock.speakingSession.findUnique.mockResolvedValueOnce(mockSession({ metrics: equalMetrics }) as never);

    const result = await recommendDrill('session-1');
    expect(result).not.toBeNull();
    expect(result?.prompt).toBeTruthy();
  });

  it('returns null when session has no metrics', async () => {
    prismaMock.speakingSession.findUnique.mockResolvedValueOnce(mockSession({ metrics: [] }) as never);

    const result = await recommendDrill('session-1');
    expect(result).toBeNull();
  });

  it('returns null when no examples can be extracted', async () => {
    prismaMock.speakingSession.findUnique.mockResolvedValueOnce(
      mockSession({
        insights: [],
        transcript: { text: '' },
      }) as never
    );

    const result = await recommendDrill('session-1');
    expect(result).toBeNull();
  });
});
