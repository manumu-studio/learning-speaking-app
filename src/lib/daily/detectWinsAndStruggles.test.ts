// Unit tests for detectWinsAndStruggles — wins, struggles, and vocab deduplication logic

import { describe, it, expect } from 'vitest';
import {
  detectWinsAndStruggles,
  type DetectInput,
  type MetricWithDelta,
  type NaturalnessIssue,
  type PronunciationIssue,
  type VocabItem,
} from './detectWinsAndStruggles';

function makeMetric(
  key: string,
  todayAvg: number,
  yesterdayAvg: number | null,
  sessionId = 'sess-1',
): MetricWithDelta {
  return { key, todayAvg, yesterdayAvg, sessionId };
}

function makeNaturalness(
  tag: string,
  flagId: string,
  detail = 'issue detail',
  sessionId = 'sess-1',
): NaturalnessIssue {
  return { tag, detail, flagId, sessionId };
}

function makePronunciation(
  tag: string,
  detail = 'pronunciation detail',
  sessionId = 'sess-1',
): PronunciationIssue {
  return { tag, detail, sessionId };
}

function makeVocab(text: string, category = 'noun', sessionId = 'sess-1'): VocabItem {
  return { text, category, sessionId };
}

function emptyInput(): DetectInput {
  return {
    metrics: [],
    naturalnessIssues: [],
    pronunciationIssues: [],
    vocabSuggestions: [],
  };
}

describe('detectWinsAndStruggles', () => {
  it('metric improvement ≥0.3 creates a win', () => {
    const input: DetectInput = {
      ...emptyInput(),
      metrics: [makeMetric('fluency', 7.5, 7.0)],
    };
    const result = detectWinsAndStruggles(input);
    expect(result.wins).toHaveLength(1);
    expect(result.wins[0]?.tag).toBe('fluency');
    expect(result.wins[0]?.detail).toContain('+0.5');
    expect(result.wins[0]?.evidenceSessionId).toBe('sess-1');
  });

  it('metric improvement <0.3 does NOT create a win', () => {
    const input: DetectInput = {
      ...emptyInput(),
      metrics: [makeMetric('fluency', 7.2, 7.0)],
    };
    const result = detectWinsAndStruggles(input);
    expect(result.wins).toHaveLength(0);
  });

  it('naturalness issues grouped by tag → single struggle with count', () => {
    const input: DetectInput = {
      ...emptyInput(),
      naturalnessIssues: [
        makeNaturalness('calque', 'flag-1'),
        makeNaturalness('calque', 'flag-2'),
        makeNaturalness('calque', 'flag-3'),
      ],
    };
    const result = detectWinsAndStruggles(input);
    const struggle = result.struggles.find((s) => s.tag === 'calque');
    expect(struggle).toBeDefined();
    expect(struggle?.count).toBe(3);
    expect(struggle?.flagIds).toEqual(['flag-1', 'flag-2', 'flag-3']);
  });

  it('pronunciation issues grouped by tag → single struggle with count', () => {
    const input: DetectInput = {
      ...emptyInput(),
      pronunciationIssues: [
        makePronunciation('th-sound'),
        makePronunciation('th-sound'),
      ],
    };
    const result = detectWinsAndStruggles(input);
    const struggle = result.struggles.find((s) => s.tag === 'th-sound');
    expect(struggle).toBeDefined();
    expect(struggle?.count).toBe(2);
  });

  it('metric drop ≥0.5 creates a struggle', () => {
    const input: DetectInput = {
      ...emptyInput(),
      metrics: [makeMetric('accuracy', 6.0, 7.0)],
    };
    const result = detectWinsAndStruggles(input);
    const struggle = result.struggles.find((s) => s.tag === 'accuracy');
    expect(struggle).toBeDefined();
    expect(struggle?.detail).toContain('-1.0');
  });

  it('wins are capped at 3', () => {
    const input: DetectInput = {
      ...emptyInput(),
      metrics: [
        makeMetric('m1', 8.0, 7.0, 's1'),
        makeMetric('m2', 8.0, 7.0, 's2'),
        makeMetric('m3', 8.0, 7.0, 's3'),
        makeMetric('m4', 8.0, 7.0, 's4'),
      ],
    };
    const result = detectWinsAndStruggles(input);
    expect(result.wins.length).toBeLessThanOrEqual(3);
  });

  it('struggles are capped at 5', () => {
    const input: DetectInput = {
      ...emptyInput(),
      naturalnessIssues: [
        makeNaturalness('tag1', 'f1'),
        makeNaturalness('tag2', 'f2'),
        makeNaturalness('tag3', 'f3'),
        makeNaturalness('tag4', 'f4'),
      ],
      pronunciationIssues: [
        makePronunciation('p1'),
        makePronunciation('p2'),
        makePronunciation('p3'),
      ],
    };
    const result = detectWinsAndStruggles(input);
    expect(result.struggles.length).toBeLessThanOrEqual(5);
  });

  it('no yesterday data → no metric-based wins or struggles', () => {
    const input: DetectInput = {
      ...emptyInput(),
      metrics: [makeMetric('fluency', 9.0, null)],
    };
    const result = detectWinsAndStruggles(input);
    expect(result.wins).toHaveLength(0);
    expect(result.struggles).toHaveLength(0);
  });

  it('vocab deduplication works case-insensitively', () => {
    const input: DetectInput = {
      ...emptyInput(),
      vocabSuggestions: [
        makeVocab('Apple'),
        makeVocab('apple'),
        makeVocab('APPLE'),
        makeVocab('banana'),
      ],
    };
    const result = detectWinsAndStruggles(input);
    expect(result.newVocabSpotted).toHaveLength(2);
    const texts = result.newVocabSpotted.map((v) => v.text.toLowerCase());
    expect(texts).toContain('apple');
    expect(texts).toContain('banana');
  });

  it('empty input returns empty results', () => {
    const result = detectWinsAndStruggles(emptyInput());
    expect(result.wins).toHaveLength(0);
    expect(result.struggles).toHaveLength(0);
    expect(result.newVocabSpotted).toHaveLength(0);
  });
});
