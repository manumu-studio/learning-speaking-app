// Unit tests for generateDailyConclusion orchestrator — cache-first, DB fetch, analytics, narrative

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '@/__mocks__/prisma';

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('./renderConclusionNarrative', () => ({
  renderConclusionNarrative: vi.fn(),
}));

import { generateDailyConclusion } from './generateDailyConclusion';
import { renderConclusionNarrative } from './renderConclusionNarrative';
import type { DailyConclusionData } from './generateDailyConclusion.types';

const userId = 'user-abc';
const date = '2026-06-01';

const mockNarrative = {
  renderedFeedback: 'Great session today! Keep it up.',
  topicSentence: 'We covered business idioms.',
};

const validConclusionData: DailyConclusionData = {
  date,
  overallScore: 7.5,
  totalDurationSecs: 360,
  topicSentence: 'We covered business idioms.',
  pillarScores: { delivery: 7.5, language: 7.5, pronunciation: 7.5 },
  metricDeltas: { delivery: null, language: null, pronunciation: null },
  wins: [],
  struggles: [],
  persistentStruggles: [],
  improvedSinceYesterday: [],
  newVocabSpotted: [],
  focusTomorrow: [],
  activeTargetsTomorrow: [],
  keyInsights: [],
  tone: 'supportive_neutral',
};

function stubNoSessions() {
  prismaMock.speakingSession.findMany.mockResolvedValue([] as never);
  prismaMock.metricSnapshot.findMany.mockResolvedValue([] as never);
  prismaMock.naturalnessFlag.findMany.mockResolvedValue([] as never);
  prismaMock.pronunciationReport.findMany.mockResolvedValue([] as never);
  prismaMock.vocabSuggestion.findMany.mockResolvedValue([] as never);
}

function stubOneDoneSession() {
  const session = { id: 'session-1', durationSecs: 360, intentLabel: 'business idioms' };

  prismaMock.speakingSession.findMany.mockResolvedValue([session] as never);
  prismaMock.metricSnapshot.findMany.mockResolvedValue([
    { sessionId: 'session-1', key: 'vocabularyPrecision', score: 7.5 },
    { sessionId: 'session-1', key: 'fillerUsage', score: 7.5 },
    { sessionId: 'session-1', key: 'connectorRepetition', score: 7.5 },
    { sessionId: 'session-1', key: 'structuralVariety', score: 7.5 },
    { sessionId: 'session-1', key: 'verbAccuracy', score: 7.5 },
    { sessionId: 'session-1', key: 'argumentClosure', score: 7.5 },
    { sessionId: 'session-1', key: 'pronunciationAccuracy', score: 7.5 },
    { sessionId: 'session-1', key: 'prosodyScore', score: 7.5 },
    { sessionId: 'session-1', key: 'speakingRate', score: 7.5 },
  ] as never);
  prismaMock.naturalnessFlag.findMany.mockResolvedValue([] as never);
  prismaMock.pronunciationReport.findMany.mockResolvedValue([] as never);
  prismaMock.vocabSuggestion.findMany.mockResolvedValue([] as never);
  prismaMock.dailyConclusion.findUnique.mockResolvedValueOnce(null as never);
  prismaMock.dailyConclusion.findUnique.mockResolvedValueOnce(null as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(renderConclusionNarrative).mockResolvedValue(mockNarrative);
});

describe('generateDailyConclusion', () => {
  it('returns cached conclusion when one already exists', async () => {
    const cachedRow = {
      id: 'cached-id',
      userId,
      date,
      conclusionJson: validConclusionData,
      renderedFeedback: 'Great session!',
      topicSentence: 'We covered business idioms.',
      sessionCount: 1,
      totalDurationSecs: 360,
      overallScore: 7.5,
      deliveryAvg: 7.5,
      languageAvg: 7.5,
      pronunciationAvg: 7.5,
      createdAt: new Date(),
    };

    prismaMock.dailyConclusion.findUnique.mockResolvedValue(cachedRow as never);

    const result = await generateDailyConclusion({ userId, date });

    expect(result).not.toBeNull();
    expect(result?.id).toBe('cached-id');
    expect(result?.conclusionData.date).toBe(date);
    expect(prismaMock.speakingSession.findMany).not.toHaveBeenCalled();
    expect(prismaMock.dailyConclusion.create).not.toHaveBeenCalled();
  });

  it('returns null when no sessions exist for the date', async () => {
    prismaMock.dailyConclusion.findUnique.mockResolvedValue(null as never);
    stubNoSessions();

    const result = await generateDailyConclusion({ userId, date });

    expect(result).toBeNull();
    expect(prismaMock.dailyConclusion.create).not.toHaveBeenCalled();
  });

  it('generates and persists conclusion when no cache exists', async () => {
    stubOneDoneSession();

    prismaMock.dailyConclusion.create.mockResolvedValue({
      id: 'new-id',
    } as never);

    const result = await generateDailyConclusion({ userId, date });

    expect(result).not.toBeNull();
    expect(result?.id).toBe('new-id');
    expect(prismaMock.dailyConclusion.create).toHaveBeenCalledOnce();
  });

  it('calls renderConclusionNarrative with the correct input shape', async () => {
    stubOneDoneSession();

    prismaMock.dailyConclusion.create.mockResolvedValue({
      id: 'new-id',
    } as never);

    await generateDailyConclusion({ userId, date });

    expect(vi.mocked(renderConclusionNarrative)).toHaveBeenCalledOnce();
    const callArg = vi.mocked(renderConclusionNarrative).mock.calls[0]?.[0];
    expect(callArg).toBeDefined();
    expect(callArg).toHaveProperty('pillarScores');
    expect(callArg).toHaveProperty('metricDeltas');
    expect(callArg).toHaveProperty('wins');
    expect(callArg).toHaveProperty('struggles');
    expect(callArg).toHaveProperty('intentLabels');
    expect(callArg?.sessionCount).toBe(1);
  });

  it('handles missing yesterday data — metricDeltas are null', async () => {
    stubOneDoneSession();

    prismaMock.dailyConclusion.create.mockResolvedValue({
      id: 'new-id',
    } as never);

    const result = await generateDailyConclusion({ userId, date });

    expect(result).not.toBeNull();
    expect(result?.conclusionData.metricDeltas.delivery).toBeNull();
    expect(result?.conclusionData.metricDeltas.language).toBeNull();
    expect(result?.conclusionData.metricDeltas.pronunciation).toBeNull();
  });

  it('throws when Zod validation fails on cached conclusion', async () => {
    const badCachedRow = {
      id: 'cached-bad',
      userId,
      date,
      conclusionJson: 'not valid json',
      renderedFeedback: 'Some feedback',
      topicSentence: 'Some topic',
      sessionCount: 1,
      totalDurationSecs: 360,
      overallScore: 7.5,
      deliveryAvg: 7.5,
      languageAvg: 7.5,
      pronunciationAvg: 7.5,
      createdAt: new Date(),
    };

    vi.mocked(prismaMock.dailyConclusion.findUnique).mockResolvedValue(badCachedRow as never);

    await expect(generateDailyConclusion({ userId, date })).rejects.toThrow();
    expect(prismaMock.speakingSession.findMany).not.toHaveBeenCalled();
  });

  it('throws when prisma.dailyConclusion.create fails', async () => {
    stubOneDoneSession();

    vi.mocked(prismaMock.dailyConclusion.create).mockRejectedValue(
      new Error('DB write failed'),
    );

    await expect(generateDailyConclusion({ userId, date })).rejects.toThrow('DB write failed');
    expect(vi.mocked(prismaMock.dailyConclusion.create)).toHaveBeenCalledOnce();
  });
});
