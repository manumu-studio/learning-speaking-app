// Unit tests for the todaysWorkout recommendation engine
import { describe, it, expect } from 'vitest';
import { computeTodaysWorkout, type PromptEntry } from './todaysWorkout';
import type { DashboardData, DashboardMetric, MetricKey } from './dashboard.types';

const EMPTY_DRILL_STATS: DashboardData['drillStats'] = {
  totalCompleted: 0,
  weeklyCompleted: 0,
  improvementRate: 0,
  byMetric: {
    connectorRepetition: 0,
    structuralVariety: 0,
    vocabularyPrecision: 0,
    verbAccuracy: 0,
    argumentClosure: 0,
    fillerUsage: 0,
    lexicalSophistication: 0,
    registerPragmatics: 0,
    pronunciationAccuracy: 0,
    prosodyScore: 0,
    speakingRate: 0,
  },
};

function makeMetric(
  key: MetricKey,
  currentScore: number,
  lastTrainedToday?: boolean,
): DashboardMetric {
  return {
    key,
    label: key,
    currentLevel: 'medium',
    currentScore,
    trend: 'stable',
    history: [currentScore],
    ...(lastTrainedToday !== undefined ? { lastTrainedToday } : {}),
  };
}

function makeDashboard(overrides: Partial<DashboardData>): DashboardData {
  return {
    weeklyMinutes: 0,
    weeklySessionCount: 0,
    totalSessions: 1,
    currentStreak: 0,
    workoutWeeks: 0,
    currentFocus: null,
    metrics: [],
    recentSessions: [],
    drillStats: EMPTY_DRILL_STATS,
    personalRecords: [],
    totalWorkoutCount: 0,
    recentProsodyPitchPreview: [],
    cefrEstimate: null,
    radarScores: [],
    ...overrides,
  };
}

const prompts: PromptEntry[] = [
  {
    id: 'p1',
    metricKey: 'fillerUsage',
    title: 'Reduce fillers',
    prompt: 'Speak without um and like.',
  },
];

describe('computeTodaysWorkout', () => {
  it('returns welcome when zero sessions', () => {
    const result = computeTodaysWorkout(makeDashboard({ totalSessions: 0 }), []);
    expect(result.kind).toBe('welcome');
  });

  it('returns welcome when no eligible metrics (all score 0)', () => {
    const result = computeTodaysWorkout(
      makeDashboard({
        metrics: [makeMetric('fillerUsage', 0), makeMetric('connectorRepetition', 0)],
      }),
      [],
    );
    expect(result.kind).toBe('welcome');
  });

  it('returns welcome when metrics array is empty', () => {
    const result = computeTodaysWorkout(makeDashboard({ metrics: [] }), []);
    expect(result.kind).toBe('welcome');
  });

  it('returns rest when all eligible metrics drilled today', () => {
    const result = computeTodaysWorkout(
      makeDashboard({
        metrics: [
          makeMetric('fillerUsage', 6, true),
          makeMetric('connectorRepetition', 5, true),
        ],
      }),
      [],
    );
    expect(result.kind).toBe('rest');
  });

  it('picks weakest metric for workout', () => {
    const result = computeTodaysWorkout(
      makeDashboard({
        metrics: [
          makeMetric('fillerUsage', 7),
          makeMetric('connectorRepetition', 3),
        ],
      }),
      [],
    );
    expect(result.kind).toBe('workout');
    if (result.kind === 'workout') {
      expect(result.metricKey).toBe('connectorRepetition');
    }
  });

  it('skips metrics already drilled today', () => {
    const result = computeTodaysWorkout(
      makeDashboard({
        metrics: [
          makeMetric('connectorRepetition', 2, true),
          makeMetric('fillerUsage', 6),
        ],
      }),
      [],
    );
    expect(result.kind).toBe('workout');
    if (result.kind === 'workout') {
      expect(result.metricKey).toBe('fillerUsage');
    }
  });

  it('applies variety principle when focus matches weakest and runner-up within 1.0', () => {
    const result = computeTodaysWorkout(
      makeDashboard({
        currentFocus: 'connectorRepetition',
        metrics: [
          makeMetric('connectorRepetition', 4),
          makeMetric('fillerUsage', 4.5),
        ],
      }),
      [],
    );
    expect(result.kind).toBe('workout');
    if (result.kind === 'workout') {
      expect(result.metricKey).toBe('fillerUsage');
    }
  });

  it('does not apply variety when runner-up is more than 1.0 away', () => {
    const result = computeTodaysWorkout(
      makeDashboard({
        currentFocus: 'connectorRepetition',
        metrics: [
          makeMetric('connectorRepetition', 4),
          makeMetric('fillerUsage', 6),
        ],
      }),
      [],
    );
    expect(result.kind).toBe('workout');
    if (result.kind === 'workout') {
      expect(result.metricKey).toBe('connectorRepetition');
    }
  });

  it('includes correct pillar context', () => {
    const result = computeTodaysWorkout(
      makeDashboard({ metrics: [makeMetric('fillerUsage', 5)] }),
      [],
    );
    expect(result.kind).toBe('workout');
    if (result.kind === 'workout') {
      expect(result.pillarKey).toBe('delivery');
      expect(result.pillarLabel).toBe('Delivery');
    }
  });

  it('attaches matching prompt when metricKey matches', () => {
    const result = computeTodaysWorkout(
      makeDashboard({ metrics: [makeMetric('fillerUsage', 5)] }),
      prompts,
    );
    expect(result.kind).toBe('workout');
    if (result.kind === 'workout') {
      expect(result.promptSuggestion?.title).toBe('Reduce fillers');
    }
  });

  it('returns null promptSuggestion when no prompt matches', () => {
    const result = computeTodaysWorkout(
      makeDashboard({ metrics: [makeMetric('connectorRepetition', 5)] }),
      prompts,
    );
    expect(result.kind).toBe('workout');
    if (result.kind === 'workout') {
      expect(result.promptSuggestion).toBeNull();
    }
  });

  it('excludes pronunciation metrics from candidates', () => {
    const result = computeTodaysWorkout(
      makeDashboard({
        metrics: [
          makeMetric('pronunciationAccuracy', 3),
          makeMetric('prosodyScore', 2),
          makeMetric('speakingRate', 4),
        ],
      }),
      [],
    );
    expect(result.kind).toBe('welcome');
  });
});
