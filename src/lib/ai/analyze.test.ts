// Tests for Claude analysis Zod schema validation
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/ai/client', () => ({
  getAnthropicClient: vi.fn(),
}));

import { analysisResultSchema, applyInsightGuardrails } from '@/lib/ai/analyze';

describe('Analysis result schema', () => {
  it('validates a correct analysis result', () => {
    const valid = {
      insights: [
        {
          category: 'grammar' as const,
          pattern: 'Missing articles before nouns',
          detail: 'Frequently omits "the" and "a" before nouns.',
          frequency: 8,
          severity: 'high' as const,
          examples: ['I went to store', 'She is teacher'],
          suggestion: 'Practice adding articles before every noun.',
        },
      ],
      metrics: [
        {
          key: 'connectorRepetition' as const,
          level: 'medium' as const,
          score: 5,
          note: 'Overuses "so" and "because"',
        },
      ],
      focusNext: 'Focus on using articles consistently.',
      summary: 'Strong vocabulary but recurring grammar issues with articles.',
      intentLabel: 'Language learning daily habits',
    };

    expect(analysisResultSchema.parse(valid)).toEqual(valid);
  });

  it('rejects invalid category', () => {
    const invalid = {
      insights: [
        {
          category: 'spelling',
          pattern: 'test',
          detail: 'test',
        },
      ],
      metrics: [],
      focusNext: 'test',
      summary: 'test',
      intentLabel: 'test',
    };

    expect(() => analysisResultSchema.parse(invalid)).toThrow();
  });

  it('rejects more than 5 insights', () => {
    const tooMany = {
      insights: Array.from({ length: 6 }, (_, i) => ({
        category: 'grammar' as const,
        pattern: `Pattern ${i}`,
        detail: `Detail ${i}`,
      })),
      metrics: [],
      focusNext: 'test',
      summary: 'test',
      intentLabel: 'test',
    };

    expect(() => analysisResultSchema.parse(tooMany)).toThrow();
  });

  it('accepts minimal insight (only required fields)', () => {
    const minimal = {
      insights: [
        {
          category: 'vocabulary' as const,
          pattern: 'Limited connectors',
          detail: 'Overuses "so" and "because".',
        },
      ],
      metrics: [],
      focusNext: 'Expand connector vocabulary.',
      summary: 'Adequate but repetitive.',
      intentLabel: 'Connector usage practice',
    };

    expect(analysisResultSchema.parse(minimal)).toEqual(minimal);
  });

  it('rejects missing focusNext', () => {
    const noFocus = {
      insights: [],
      metrics: [],
      summary: 'Good overall.',
      intentLabel: 'test',
    };

    expect(() => analysisResultSchema.parse(noFocus)).toThrow();
  });

  it('rejects missing summary', () => {
    const noSummary = {
      insights: [],
      metrics: [],
      focusNext: 'Practice more.',
      intentLabel: 'test',
    };

    expect(() => analysisResultSchema.parse(noSummary)).toThrow();
  });

  it('rejects missing intentLabel', () => {
    const noLabel = {
      insights: [],
      metrics: [],
      focusNext: 'Practice more.',
      summary: 'Good overall.',
    };

    expect(() => analysisResultSchema.parse(noLabel)).toThrow();
  });

  it('rejects non-JSON input when used with JSON.parse', () => {
    const notJson = 'this is not json {{{';
    expect(() => {
      const parsed: unknown = JSON.parse(notJson);
      analysisResultSchema.parse(parsed);
    }).toThrow(SyntaxError);
  });

  it('rejects valid JSON missing metrics array', () => {
    const missingMetrics = {
      insights: [],
      focusNext: 'Focus on articles.',
      summary: 'Good overall.',
      intentLabel: 'Daily chat',
    };
    expect(() => analysisResultSchema.parse(missingMetrics)).toThrow();
  });
});

describe('applyInsightGuardrails', () => {
  it('removes insights referencing ⟨?...?⟩ markers with question marks inside', () => {
    const kept = applyInsightGuardrails([
      {
        category: 'vocabulary',
        pattern: 'Uncertain phrase',
        detail: 'Low confidence segment',
        examples: ['asked ⟨?How does this work??⟩ during the demo'],
      },
    ]);
    expect(kept).toHaveLength(0);
  });

  it('removes insights with confidence below 4', () => {
    const kept = applyInsightGuardrails([
      {
        category: 'grammar',
        pattern: 'Articles',
        detail: 'Missing articles',
        frequency: 3,
        confidence: 3,
        examples: ['went to store', 'is teacher'],
      },
    ]);
    expect(kept).toHaveLength(0);
  });

  it('keeps genuine pattern with frequency >= 2 and confidence >= 4', () => {
    const insight = {
      category: 'grammar' as const,
      pattern: 'Subject-verb agreement',
      detail: 'Uses goes with I',
      frequency: 3,
      confidence: 5,
      examples: ['I goes to work', 'I goes home'],
    };
    expect(applyInsightGuardrails([insight])).toEqual([insight]);
  });
});
