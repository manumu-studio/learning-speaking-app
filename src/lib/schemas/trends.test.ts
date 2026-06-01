// Tests for shared Zod schemas used by the trends feature API and client hooks
import { describe, expect, it } from 'vitest';

import {
  MetricKeySchema,
  PillarKeySchema,
  PillarTrendSchema,
  RangeSchema,
  TrendDataPointSchema,
  TrendsResponseSchema,
} from './trends';

// ── MetricKeySchema ──────────────────────────────────────────────────────────

describe('MetricKeySchema', () => {
  const validKeys = [
    'connectorRepetition',
    'structuralVariety',
    'vocabularyPrecision',
    'verbAccuracy',
    'argumentClosure',
    'fillerUsage',
    'lexicalSophistication',
    'pronunciationAccuracy',
    'prosodyScore',
    'speakingRate',
  ] as const;

  it('accepts all 10 valid metric keys', () => {
    for (const key of validKeys) {
      expect(() => MetricKeySchema.parse(key)).not.toThrow();
    }
  });

  it('rejects an invalid metric key', () => {
    expect(() => MetricKeySchema.parse('unknownMetric')).toThrow();
    expect(() => MetricKeySchema.parse('')).toThrow();
  });
});

// ── PillarKeySchema ──────────────────────────────────────────────────────────

describe('PillarKeySchema', () => {
  it('accepts delivery, language, and pronunciation', () => {
    expect(() => PillarKeySchema.parse('delivery')).not.toThrow();
    expect(() => PillarKeySchema.parse('language')).not.toThrow();
    expect(() => PillarKeySchema.parse('pronunciation')).not.toThrow();
  });

  it('rejects an invalid pillar key', () => {
    expect(() => PillarKeySchema.parse('fluency')).toThrow();
    expect(() => PillarKeySchema.parse('Delivery')).toThrow();
  });
});

// ── RangeSchema ──────────────────────────────────────────────────────────────

describe('RangeSchema', () => {
  it('accepts 7d, 30d, 90d, and all', () => {
    expect(() => RangeSchema.parse('7d')).not.toThrow();
    expect(() => RangeSchema.parse('30d')).not.toThrow();
    expect(() => RangeSchema.parse('90d')).not.toThrow();
    expect(() => RangeSchema.parse('all')).not.toThrow();
  });

  it('rejects an invalid range', () => {
    expect(() => RangeSchema.parse('1d')).toThrow();
    expect(() => RangeSchema.parse('180d')).toThrow();
    expect(() => RangeSchema.parse('')).toThrow();
  });
});

// ── TrendDataPointSchema ─────────────────────────────────────────────────────

const validScores = {
  connectorRepetition: 7,
  structuralVariety: 8,
  vocabularyPrecision: 6,
  verbAccuracy: 9,
  argumentClosure: 5,
  fillerUsage: 4,
  lexicalSophistication: 6,
  pronunciationAccuracy: 8,
  prosodyScore: 7,
  speakingRate: 6,
} as const;

describe('TrendDataPointSchema', () => {
  it('accepts a valid data point', () => {
    const result = TrendDataPointSchema.safeParse({
      date: '2026-05-28',
      scores: validScores,
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid date format', () => {
    expect(() =>
      TrendDataPointSchema.parse({ date: '28-05-2026', scores: validScores }),
    ).toThrow();
    expect(() =>
      TrendDataPointSchema.parse({ date: '2026/05/28', scores: validScores }),
    ).toThrow();
    expect(() =>
      TrendDataPointSchema.parse({ date: 'not-a-date', scores: validScores }),
    ).toThrow();
  });

  it('rejects scores below 0', () => {
    expect(() =>
      TrendDataPointSchema.parse({
        date: '2026-05-28',
        scores: { ...validScores, speakingRate: -1 },
      }),
    ).toThrow();
  });

  it('rejects scores above 10', () => {
    expect(() =>
      TrendDataPointSchema.parse({
        date: '2026-05-28',
        scores: { ...validScores, pronunciationAccuracy: 11 },
      }),
    ).toThrow();
  });
});

// ── PillarTrendSchema ────────────────────────────────────────────────────────

const validPillarTrend = {
  pillarKey: 'language',
  label: 'Language',
  color: '#6366f1',
  dataPoints: [
    { date: '2026-05-28', averageScore: 7.5 },
    { date: '2026-05-27', averageScore: 6.8 },
  ],
  deltaPercent: 10.3,
} as const;

describe('PillarTrendSchema', () => {
  it('accepts a valid pillar trend', () => {
    const result = PillarTrendSchema.safeParse(validPillarTrend);
    expect(result.success).toBe(true);
  });

  it('accepts null deltaPercent', () => {
    const result = PillarTrendSchema.safeParse({ ...validPillarTrend, deltaPercent: null });
    expect(result.success).toBe(true);
  });

  it('rejects a deltaPercent that is undefined (field must be present)', () => {
    const withoutDelta = { ...validPillarTrend } as Record<string, unknown>;
    delete withoutDelta.deltaPercent;
    const result = PillarTrendSchema.safeParse(withoutDelta);
    expect(result.success).toBe(false);
  });

  it('rejects an invalid pillarKey', () => {
    const result = PillarTrendSchema.safeParse({ ...validPillarTrend, pillarKey: 'grammar' });
    expect(result.success).toBe(false);
  });
});

// ── TrendsResponseSchema ─────────────────────────────────────────────────────

const validTrendsResponse = {
  range: '30d',
  dataPoints: [{ date: '2026-05-28', scores: validScores }],
  pillarTrends: [validPillarTrend],
  sessionCount: 12,
} as const;

describe('TrendsResponseSchema', () => {
  it('accepts a full valid response', () => {
    const result = TrendsResponseSchema.safeParse(validTrendsResponse);
    expect(result.success).toBe(true);
  });

  it('accepts a response with empty arrays', () => {
    const result = TrendsResponseSchema.safeParse({
      ...validTrendsResponse,
      dataPoints: [],
      pillarTrends: [],
      sessionCount: 0,
    });
    expect(result.success).toBe(true);
  });

  it('rejects a negative sessionCount', () => {
    const result = TrendsResponseSchema.safeParse({ ...validTrendsResponse, sessionCount: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects a non-integer sessionCount', () => {
    const result = TrendsResponseSchema.safeParse({
      ...validTrendsResponse,
      sessionCount: 3.7,
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid range value', () => {
    const result = TrendsResponseSchema.safeParse({ ...validTrendsResponse, range: '14d' });
    expect(result.success).toBe(false);
  });
});
