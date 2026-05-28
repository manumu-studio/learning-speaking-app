// Unit tests for matchInsightsToSentences
import { describe, it, expect } from 'vitest';
import { matchInsightsToSentences } from './matchInsightsToSentences';
import type { MatchableInsight } from './matchInsightsToSentences';
import { splitSentences } from './splitSentences';

const sentences = splitSentences(
  'I think so because it is important. So basically we can see that. The result is clear.',
);

const metrics = [
  { key: 'connectorRepetition', score: 4 },
  { key: 'fillerUsage', score: 7 },
];

describe('matchInsightsToSentences', () => {
  it('returns empty map when insights have no examples', () => {
    const insights: MatchableInsight[] = [
      { id: '1', category: 'connector', pattern: 'overuse', suggestion: null, examples: [] },
    ];
    const result = matchInsightsToSentences(insights, sentences, metrics);
    expect(result.size).toBe(0);
  });

  it('matches via exact substring (case-insensitive)', () => {
    const insights: MatchableInsight[] = [
      {
        id: '1',
        category: 'connector',
        pattern: 'Overuse of "so"',
        suggestion: 'Try "therefore"',
        examples: ['So basically'],
      },
    ];
    const result = matchInsightsToSentences(insights, sentences, metrics);
    expect(result.has(1)).toBe(true);
    expect(result.get(1)?.[0]?.pinVariant).toBe('sharpen');
  });

  it('assigns "building" variant when metric score is 5–7.9', () => {
    const insights: MatchableInsight[] = [
      {
        id: '2',
        category: 'filler',
        pattern: 'Filler use',
        suggestion: null,
        examples: ['I think so'],
      },
    ];
    const result = matchInsightsToSentences(insights, sentences, metrics);
    const annotation = [...result.values()].flat()[0];
    expect(annotation?.pinVariant).toBe('building');
  });

  it('assigns "building" default when category has no matching metric', () => {
    const insights: MatchableInsight[] = [
      {
        id: '3',
        category: 'unknown-category',
        pattern: 'Mystery',
        suggestion: null,
        examples: ['The result is clear'],
      },
    ];
    const result = matchInsightsToSentences(insights, sentences, []);
    const annotation = [...result.values()].flat()[0];
    expect(annotation?.pinVariant).toBe('building');
  });

  it('does not add duplicate annotations for the same insight on the same sentence', () => {
    const insights: MatchableInsight[] = [
      {
        id: '4',
        category: 'connector',
        pattern: 'Pattern',
        suggestion: null,
        examples: ['I think so because', 'think so because it'],
      },
    ];
    const result = matchInsightsToSentences(insights, sentences, metrics);
    const annotations = result.get(0) ?? [];
    expect(annotations.filter((a) => a.insightId === '4')).toHaveLength(1);
  });
});
