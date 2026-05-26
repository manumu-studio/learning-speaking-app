// Unit tests for NER post-filter on Claude analysis insights
import { describe, it, expect } from 'vitest';
import { filterTranscriptionArtefacts } from '@/lib/ai/nerFilter';
import type { Insight } from '@/lib/ai/analyze';

function makeInsight(overrides: Partial<Insight>): Insight {
  return {
    category: 'vocabulary',
    pattern: 'test pattern',
    detail: 'test detail',
    frequency: 3,
    examples: ['example one', 'example two'],
    ...overrides,
  };
}

describe('filterTranscriptionArtefacts', () => {
  const techTranscript =
    'We use Anthropic Claude with PostgreSQL and Docker. The API returns JSON for TypeScript clients.';

  it('filters proper noun Anthropic flagged as vocab error', () => {
    const result = filterTranscriptionArtefacts(
      [makeInsight({ pattern: 'Misuse of Anthropic', examples: ['Anthropic API', 'call Anthropic'] })],
      techTranscript,
    );
    expect(result.kept).toHaveLength(0);
    expect(result.filtered).toHaveLength(1);
  });

  it('filters PostgreSQL product name', () => {
    const result = filterTranscriptionArtefacts(
      [makeInsight({ pattern: 'PostgreSQL spelling', examples: ['use PostgreSQL', 'PostgreSQL db'] })],
      techTranscript,
    );
    expect(result.kept).toHaveLength(0);
  });

  it('filters Docker product name', () => {
    const result = filterTranscriptionArtefacts(
      [makeInsight({ pattern: 'Docker usage', examples: ['run Docker', 'Docker image'] })],
      techTranscript,
    );
    expect(result.kept).toHaveLength(0);
  });

  it('filters API acronym', () => {
    const result = filterTranscriptionArtefacts(
      [makeInsight({ pattern: 'API error', examples: ['the API', 'API call'] })],
      'The API returns data. We call the API again.',
    );
    expect(result.kept).toHaveLength(0);
  });

  it('filters JSON acronym', () => {
    const result = filterTranscriptionArtefacts(
      [makeInsight({ pattern: 'JSON mistake', examples: ['parse JSON', 'invalid JSON'] })],
      techTranscript,
    );
    expect(result.kept).toHaveLength(0);
  });

  it('filters single-occurrence common word', () => {
    const result = filterTranscriptionArtefacts(
      [makeInsight({ pattern: 'goed instead of went', examples: ['I goed home'] })],
      'I goed home yesterday.',
    );
    expect(result.kept).toHaveLength(0);
    expect(result.filterReasons.some((r) => r.reason.includes('times'))).toBe(true);
  });

  it('keeps common word appearing three times', () => {
    const result = filterTranscriptionArtefacts(
      [
        makeInsight({
          category: 'grammar',
          pattern: 'Subject-verb agreement',
          examples: ['I goes to work', 'she goes often', 'he goes there'],
          frequency: 3,
        }),
      ],
      'I goes to work. She goes often. He goes there.',
    );
    expect(result.kept).toHaveLength(1);
  });

  it('filters PascalCase TypeScript tech term', () => {
    const result = filterTranscriptionArtefacts(
      [makeInsight({ pattern: 'TypeScript misuse', examples: ['TypeScript types', 'in TypeScript'] })],
      techTranscript,
    );
    expect(result.kept).toHaveLength(0);
  });

  it('filters camelCase executePipeline tech term', () => {
    const result = filterTranscriptionArtefacts(
      [
        makeInsight({
          pattern: 'executePipeline naming',
          examples: ['call executePipeline', 'executePipeline runs'],
        }),
      ],
      'We call executePipeline twice. The executePipeline runs fast.',
    );
    expect(result.kept).toHaveLength(0);
  });

  it('keeps genuine learner error with frequency >= 2', () => {
    const result = filterTranscriptionArtefacts(
      [
        makeInsight({
          category: 'grammar',
          pattern: 'Past tense goed',
          examples: ['I goed home', 'we goed there'],
          frequency: 2,
        }),
      ],
      'I goed home. We goed there again.',
    );
    expect(result.kept).toHaveLength(1);
    expect(result.filtered).toHaveLength(0);
  });

  it('still filters proper noun that appears five times', () => {
    const transcript = 'Anthropic Anthropic Anthropic Anthropic Anthropic';
    const result = filterTranscriptionArtefacts(
      [
        makeInsight({
          pattern: 'Anthropic vocabulary',
          examples: ['Anthropic model', 'Anthropic API'],
          frequency: 5,
        }),
      ],
      transcript,
    );
    expect(result.kept).toHaveLength(0);
  });

  it('returns empty arrays for empty input', () => {
    const result = filterTranscriptionArtefacts([], 'any transcript');
    expect(result.kept).toEqual([]);
    expect(result.filtered).toEqual([]);
    expect(result.filterReasons).toEqual([]);
  });

  it('populates filterReasons for removed issues', () => {
    const result = filterTranscriptionArtefacts(
      [makeInsight({ pattern: 'Anthropic error' })],
      techTranscript,
    );
    expect(result.filterReasons.length).toBeGreaterThan(0);
    expect(result.filterReasons[0]?.word).toBeTruthy();
  });
});
