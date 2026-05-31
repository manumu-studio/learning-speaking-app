// Tests for Claude analysis Zod schema validation and analyzeTranscript integration
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreate = vi.fn();

vi.mock('@/lib/ai/client', () => ({
  getAnthropicClient: vi.fn(() => ({
    messages: {
      create: mockCreate,
    },
  })),
}));

vi.mock('@/lib/ai/analysisCache', () => ({
  hashTranscript: vi.fn(() => 'mock-hash'),
  getCachedAnalysis: vi.fn(),
  setCachedAnalysis: vi.fn(),
}));

import {
  analysisResultSchema,
  applyInsightGuardrails,
  analyzeTranscript,
} from '@/lib/ai/analyze';
import {
  getCachedAnalysis,
  setCachedAnalysis,
} from '@/lib/ai/analysisCache';

const baseValidResult = {
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

const enrichedFields = {
  coherenceScore: {
    score: 7,
    topicDevelopment: 'You introduced the topic clearly and developed one main point.',
    logicalFlow: 'Your transitions were mostly smooth with occasional abrupt shifts.',
    discourseMarkersUsed: ['however', 'so'],
    discourseMarkersRecommended: ['therefore', 'in contrast'],
  },
  vocabularyDiversity: {
    typeTokenRatio: 0.55,
    academicWordCount: 4,
    repetitionFlags: [
      {
        word: 'good',
        count: 5,
        alternatives: ['effective', 'solid', 'compelling'],
      },
    ],
  },
  l1Interference: [
    {
      type: 'calque' as const,
      detected: 'I have 30 years',
      explanation: "Calque from Spanish 'tengo 30 años' — age uses 'to be', not 'to have'.",
      suggestion: 'I am 30 years old',
    },
  ],
};

describe('Analysis result schema', () => {
  it('validates a correct analysis result', () => {
    expect(analysisResultSchema.parse(baseValidResult)).toEqual(baseValidResult);
  });

  it('accepts null values for optional insight fields (nullish)', () => {
    const withNulls = {
      ...baseValidResult,
      insights: [
        {
          category: 'grammar' as const,
          pattern: 'Test',
          detail: 'Test detail',
          frequency: null,
          severity: null,
          examples: null,
          suggestion: null,
          confidence: null,
        },
      ],
    };
    const parsed = analysisResultSchema.parse(withNulls);
    expect(parsed.insights[0]?.frequency).toBeNull();
    expect(parsed.insights[0]?.severity).toBeNull();
  });

  it('accepts coherenceScore with score 0 for empty transcripts', () => {
    const withZeroScore = {
      ...baseValidResult,
      coherenceScore: {
        ...enrichedFields.coherenceScore,
        score: 0,
      },
    };
    expect(() => analysisResultSchema.parse(withZeroScore)).not.toThrow();
  });

  it('validates with coherenceScore present', () => {
    const withCoherence = { ...baseValidResult, coherenceScore: enrichedFields.coherenceScore };
    expect(analysisResultSchema.parse(withCoherence)).toEqual(withCoherence);
  });

  it('validates without coherenceScore when field is absent', () => {
    expect(analysisResultSchema.parse(baseValidResult)).toEqual(baseValidResult);
  });

  it('validates with vocabularySuggestions when present', () => {
    const withVocab = {
      ...baseValidResult,
      vocabularySuggestions: [
        { word: 'establish', meaning: 'To set up formally.', exampleSentence: 'We need to establish clear goals.' },
        { word: 'demonstrate', meaning: 'To show clearly.', exampleSentence: 'This example demonstrates the pattern.' },
      ],
    };
    expect(analysisResultSchema.parse(withVocab)).toEqual(withVocab);
  });

  it('accepts vocabularySuggestions with fewer than 2 items', () => {
    const singleItem = {
      ...baseValidResult,
      vocabularySuggestions: [
        { word: 'only', meaning: 'One item.', exampleSentence: 'Only one suggestion.' },
      ],
    };
    expect(() => analysisResultSchema.parse(singleItem)).not.toThrow();
  });

  it('rejects vocabularyDiversity repetitionFlags with count below 2', () => {
    const invalid = {
      ...baseValidResult,
      vocabularyDiversity: {
        typeTokenRatio: 0.5,
        academicWordCount: 2,
        repetitionFlags: [{ word: 'good', count: 1, alternatives: ['fine', 'solid'] }],
      },
    };
    expect(() => analysisResultSchema.parse(invalid)).toThrow();
  });

  it('rejects l1Interference with unknown type', () => {
    const invalid = {
      ...baseValidResult,
      l1Interference: [
        {
          type: 'unknown_type',
          detected: 'test',
          explanation: 'test',
          suggestion: 'test',
        },
      ],
    };
    expect(() => analysisResultSchema.parse(invalid)).toThrow();
  });

  it('validates with all three new optional fields present', () => {
    const full = { ...baseValidResult, ...enrichedFields };
    expect(analysisResultSchema.parse(full)).toEqual(full);
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

describe('analyzeTranscript', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns cached result without calling Claude on cache hit', async () => {
    const cached = { ...baseValidResult, ...enrichedFields };
    vi.mocked(getCachedAnalysis).mockResolvedValue(cached);

    const result = await analyzeTranscript('cached transcript');

    expect(result).toEqual(cached);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('calls Claude and writes cache on cache miss', async () => {
    vi.mocked(getCachedAnalysis).mockResolvedValue(null);
    const claudeResponse = { ...baseValidResult, ...enrichedFields };
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(claudeResponse) }],
    });

    const result = await analyzeTranscript('fresh transcript');

    expect(mockCreate).toHaveBeenCalled();
    expect(setCachedAnalysis).toHaveBeenCalledWith('mock-hash', expect.objectContaining({
      focusNext: claudeResponse.focusNext,
    }));
    expect(result.focusNext).toBe(claudeResponse.focusNext);
  });

  it('uses a top-level system prompt and single user message', async () => {
    vi.mocked(getCachedAnalysis).mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(baseValidResult) }],
    });

    await analyzeTranscript('test transcript');

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('English language pattern analyzer'),
        messages: [{ role: 'user', content: expect.stringContaining('Transcript:') }],
        max_tokens: 3072,
      }),
    );

    const callArgs = mockCreate.mock.calls[0]?.[0];
    expect(typeof callArgs?.system).toBe('string');
    expect(callArgs?.messages).toHaveLength(1);
    expect(callArgs?.messages?.[0]?.role).toBe('user');
  });

  it('still applies insight guardrails after Claude response', async () => {
    vi.mocked(getCachedAnalysis).mockResolvedValue(null);
    const responseWithSuspectInsight = {
      ...baseValidResult,
      insights: [
        {
          category: 'vocabulary' as const,
          pattern: 'Uncertain phrase',
          detail: 'Low confidence segment',
          examples: ['asked ⟨?How does this work??⟩ during the demo', 'another example'],
        },
      ],
    };
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(responseWithSuspectInsight) }],
    });

    const result = await analyzeTranscript('transcript with suspect markers');

    expect(result.insights).toHaveLength(0);
  });
});
