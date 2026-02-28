// Tests for Claude analysis Zod schema validation
import { describe, it, expect } from 'vitest';

// Import the schema by re-creating it here (the original is not exported)
// We test the SHAPE, not the API call
import { z } from 'zod';

const insightSchema = z.object({
  category: z.enum(['grammar', 'vocabulary', 'structure']),
  pattern: z.string(),
  detail: z.string(),
  frequency: z.number().optional(),
  severity: z.enum(['high', 'medium', 'low']).optional(),
  examples: z.array(z.string()).optional(),
  suggestion: z.string().optional(),
});

const analysisResultSchema = z.object({
  insights: z.array(insightSchema).max(5),
  focusNext: z.string(),
  summary: z.string(),
  intentLabel: z.string(),
});

describe('Analysis result schema', () => {
  it('validates a correct analysis result', () => {
    const valid = {
      insights: [
        {
          category: 'grammar',
          pattern: 'Missing articles before nouns',
          detail: 'Frequently omits "the" and "a" before nouns.',
          frequency: 8,
          severity: 'high',
          examples: ['I went to store', 'She is teacher'],
          suggestion: 'Practice adding articles before every noun.',
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
      focusNext: 'test',
      summary: 'test',
      intentLabel: 'test',
    };

    expect(() => analysisResultSchema.parse(invalid)).toThrow();
  });

  it('rejects more than 5 insights', () => {
    const tooMany = {
      insights: Array.from({ length: 6 }, (_, i) => ({
        category: 'grammar',
        pattern: `Pattern ${i}`,
        detail: `Detail ${i}`,
      })),
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
          category: 'vocabulary',
          pattern: 'Limited connectors',
          detail: 'Overuses "so" and "because".',
        },
      ],
      focusNext: 'Expand connector vocabulary.',
      summary: 'Adequate but repetitive.',
      intentLabel: 'Connector usage practice',
    };

    expect(analysisResultSchema.parse(minimal)).toEqual(minimal);
  });

  it('rejects missing focusNext', () => {
    const noFocus = {
      insights: [],
      summary: 'Good overall.',
      intentLabel: 'test',
    };

    expect(() => analysisResultSchema.parse(noFocus)).toThrow();
  });

  it('rejects missing summary', () => {
    const noSummary = {
      insights: [],
      focusNext: 'Practice more.',
      intentLabel: 'test',
    };

    expect(() => analysisResultSchema.parse(noSummary)).toThrow();
  });

  it('rejects missing intentLabel', () => {
    const noLabel = {
      insights: [],
      focusNext: 'Practice more.',
      summary: 'Good overall.',
    };

    expect(() => analysisResultSchema.parse(noLabel)).toThrow();
  });
});
