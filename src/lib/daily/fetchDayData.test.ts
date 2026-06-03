// Tests for fetchDayData and fetchYesterdayPillarScores — DB query assembly and null guards
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '@/__mocks__/prisma';

// --- Module mocks ---
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { fetchDayData, fetchYesterdayPillarScores } from './fetchDayData';

// --- Fixtures ---
const userId = 'user-1';
const date = '2026-06-01';

const mockSessions = [
  { id: 'session-1', durationSecs: 90, intentLabel: 'Job interview prep' },
];

const mockMetricSnapshots = [
  { sessionId: 'session-1', key: 'connectorRepetition', score: 7.5 },
  { sessionId: 'session-1', key: 'vocabularyPrecision', score: 8.0 },
];

const mockNaturalnessFlags = [
  {
    id: 'flag-1',
    sessionId: 'session-1',
    flagType: 'calque',
    originalPhrase: 'make me a favor',
    suggestedPhrase: 'do me a favor',
  },
];

const mockPronunciationReports = [
  { sessionId: 'session-1', pronScore: 55 },
];

const mockVocabSuggestions = [
  { word: 'nevertheless', type: 'connector', suggestedInSessionId: 'session-1' },
];

// --- Tests ---
describe('fetchDayData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when no sessions exist for the date', async () => {
    prismaMock.speakingSession.findMany.mockResolvedValue([] as never);

    const result = await fetchDayData({ userId, date });

    expect(result).toBeNull();
    expect(prismaMock.metricSnapshot.findMany).not.toHaveBeenCalled();
  });

  it('returns assembled DayData when sessions exist', async () => {
    prismaMock.speakingSession.findMany.mockResolvedValue(mockSessions as never);
    prismaMock.metricSnapshot.findMany.mockResolvedValue(mockMetricSnapshots as never);
    prismaMock.naturalnessFlag.findMany.mockResolvedValue(mockNaturalnessFlags as never);
    prismaMock.pronunciationReport.findMany.mockResolvedValue(mockPronunciationReports as never);
    prismaMock.vocabSuggestion.findMany.mockResolvedValue(mockVocabSuggestions as never);

    const result = await fetchDayData({ userId, date });

    expect(result).not.toBeNull();
    expect(result?.sessions).toHaveLength(1);
    expect(result?.sessions[0]?.id).toBe('session-1');
    expect(result?.sessions[0]?.metrics).toHaveLength(2);

    // naturalnessIssues mapped from flags
    expect(result?.naturalnessIssues).toHaveLength(1);
    expect(result?.naturalnessIssues[0]?.detail).toContain('make me a favor');

    // pronunciationIssues: pronScore 55 < 60 threshold → included
    expect(result?.pronunciationIssues).toHaveLength(1);
    expect(result?.pronunciationIssues[0]?.tag).toBe('low_pronunciation');

    // vocabItems mapped from suggestions
    expect(result?.vocabItems).toHaveLength(1);
    expect(result?.vocabItems[0]?.text).toBe('nevertheless');
  });

  it('excludes pronunciation reports with score >= 60 from issues', async () => {
    prismaMock.speakingSession.findMany.mockResolvedValue(mockSessions as never);
    prismaMock.metricSnapshot.findMany.mockResolvedValue([] as never);
    prismaMock.naturalnessFlag.findMany.mockResolvedValue([] as never);
    prismaMock.pronunciationReport.findMany.mockResolvedValue([
      { sessionId: 'session-1', pronScore: 80 },
    ] as never);
    prismaMock.vocabSuggestion.findMany.mockResolvedValue([] as never);

    const result = await fetchDayData({ userId, date });

    expect(result?.pronunciationIssues).toHaveLength(0);
  });
});

describe('fetchYesterdayPillarScores', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when no daily conclusion exists for yesterday', async () => {
    prismaMock.dailyConclusion.findUnique.mockResolvedValue(null as never);

    const result = await fetchYesterdayPillarScores(userId, date);

    expect(result).toBeNull();
  });

  it('returns pillar scores when daily conclusion exists', async () => {
    prismaMock.dailyConclusion.findUnique.mockResolvedValue({
      deliveryAvg: 7.5,
      languageAvg: 8.0,
      pronunciationAvg: 6.5,
    } as never);

    const result = await fetchYesterdayPillarScores(userId, date);

    expect(result).not.toBeNull();
    expect(result?.delivery).toBe(7.5);
    expect(result?.language).toBe(8.0);
    expect(result?.pronunciation).toBe(6.5);
  });

  it('queries for the day before the provided date', async () => {
    prismaMock.dailyConclusion.findUnique.mockResolvedValue(null as never);

    await fetchYesterdayPillarScores(userId, '2026-06-01');

    expect(prismaMock.dailyConclusion.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_date: { userId, date: '2026-05-31' } },
      }),
    );
  });
});
