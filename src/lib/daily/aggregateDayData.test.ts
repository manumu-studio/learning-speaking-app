// Tests for aggregateDayData — session aggregation into pillar scores and totals

import { describe, it, expect } from 'vitest';
import { aggregateDayData } from './aggregateDayData';
import type { DaySessionData } from './aggregateDayData';

const deliveryMetrics = [
  { key: 'speakingRate', score: 8.0 },
  { key: 'fillerUsage', score: 6.0 },
  { key: 'argumentClosure', score: 7.0 },
];

const languageMetrics = [
  { key: 'connectorRepetition', score: 7.0 },
  { key: 'structuralVariety', score: 8.0 },
  { key: 'vocabularyPrecision', score: 6.0 },
  { key: 'verbAccuracy', score: 9.0 },
  { key: 'lexicalSophistication', score: 7.0 },
  { key: 'registerPragmatics', score: 8.0 },
];

const pronunciationMetrics = [
  { key: 'pronunciationAccuracy', score: 9.0 },
  { key: 'prosodyScore', score: 7.0 },
];

const allMetrics = [...deliveryMetrics, ...languageMetrics, ...pronunciationMetrics];

describe('aggregateDayData', () => {
  it('returns zeroes and empty arrays for empty sessions', () => {
    const result = aggregateDayData([]);
    expect(result.sessionCount).toBe(0);
    expect(result.totalDurationSecs).toBe(0);
    expect(result.pillarScores).toEqual({ delivery: 0, language: 0, pronunciation: 0 });
    expect(result.intentLabels).toEqual([]);
    expect(result.perMetricAverages).toEqual([]);
  });

  it('computes correct pillar averages for a single session with all metrics', () => {
    const session: DaySessionData = {
      sessionId: 's1',
      durationSecs: 120,
      intentLabel: 'Job interview practice',
      metrics: allMetrics,
    };

    const result = aggregateDayData([session]);

    // Delivery: mean(8, 6, 7) = 7.0
    expect(result.pillarScores.delivery).toBeCloseTo(7.0);
    // Language: mean(7, 8, 6, 9, 7, 8) = 7.5
    expect(result.pillarScores.language).toBeCloseTo(7.5);
    // Pronunciation: mean(9, 7) = 8.0
    expect(result.pillarScores.pronunciation).toBeCloseTo(8.0);
  });

  it('averages metrics correctly across multiple sessions', () => {
    const session1: DaySessionData = {
      sessionId: 's1',
      durationSecs: 60,
      intentLabel: 'Topic A',
      metrics: [{ key: 'speakingRate', score: 6.0 }],
    };
    const session2: DaySessionData = {
      sessionId: 's2',
      durationSecs: 90,
      intentLabel: 'Topic B',
      metrics: [{ key: 'speakingRate', score: 8.0 }],
    };

    const result = aggregateDayData([session1, session2]);

    const speakingRateEntry = result.perMetricAverages.find((m) => m.key === 'speakingRate');
    // (6 + 8) / 2 = 7.0
    expect(speakingRateEntry?.average).toBeCloseTo(7.0);
  });

  it('sums total duration across multiple sessions', () => {
    const sessions: DaySessionData[] = [
      { sessionId: 's1', durationSecs: 60, intentLabel: null, metrics: [] },
      { sessionId: 's2', durationSecs: 90, intentLabel: null, metrics: [] },
      { sessionId: 's3', durationSecs: 30, intentLabel: null, metrics: [] },
    ];

    const result = aggregateDayData(sessions);
    expect(result.totalDurationSecs).toBe(180);
  });

  it('treats null durationSecs as 0', () => {
    const sessions: DaySessionData[] = [
      { sessionId: 's1', durationSecs: null, intentLabel: null, metrics: [] },
      { sessionId: 's2', durationSecs: 90, intentLabel: null, metrics: [] },
    ];

    const result = aggregateDayData(sessions);
    expect(result.totalDurationSecs).toBe(90);
  });

  it('collects intentLabels from sessions and filters null values', () => {
    const sessions: DaySessionData[] = [
      { sessionId: 's1', durationSecs: 60, intentLabel: 'Topic A', metrics: [] },
      { sessionId: 's2', durationSecs: 60, intentLabel: null, metrics: [] },
      { sessionId: 's3', durationSecs: 60, intentLabel: 'Topic B', metrics: [] },
    ];

    const result = aggregateDayData(sessions);
    expect(result.intentLabels).toEqual(['Topic A', 'Topic B']);
  });

  it('returns correct session count', () => {
    const sessions: DaySessionData[] = [
      { sessionId: 's1', durationSecs: 60, intentLabel: null, metrics: [] },
      { sessionId: 's2', durationSecs: 60, intentLabel: null, metrics: [] },
    ];

    const result = aggregateDayData(sessions);
    expect(result.sessionCount).toBe(2);
  });

  it('returns 0 pillar score when no sessions have matching metrics', () => {
    const sessions: DaySessionData[] = [
      { sessionId: 's1', durationSecs: 60, intentLabel: null, metrics: [] },
    ];

    const result = aggregateDayData(sessions);
    expect(result.pillarScores.delivery).toBe(0);
    expect(result.pillarScores.language).toBe(0);
    expect(result.pillarScores.pronunciation).toBe(0);
  });
});
