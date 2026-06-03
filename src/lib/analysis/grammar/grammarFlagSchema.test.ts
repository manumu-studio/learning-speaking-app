// Unit tests for Zod schemas in grammarFlagSchema — validates grammar flag structure and constraints
import { describe, it, expect } from 'vitest';
import {
  grammarFlagSchema,
  grammarFlagsResponseSchema,
  grammarClassificationSchema,
  grammarErrorTypeSchema,
} from './grammarFlagSchema';

const makeValidFlag = (overrides: Record<string, unknown> = {}) => ({
  spanIndex: 0,
  verbatimText: 'I goed home',
  normalizedText: 'I went home',
  classification: 'grammar_error' as const,
  errorType: 'verb_tense' as const,
  confidence: 0.85,
  explanation: 'Wrong past tense form.',
  suggestion: 'Use "went" instead of "goed".',
  corpusEvidence: null,
  ...overrides,
});

describe('grammarClassificationSchema', () => {
  it.each([
    'grammar_error',
    'self_correction',
    'pronunciation_artifact',
    'false_start',
  ] as const)('accepts classification "%s"', (value) => {
    expect(() => grammarClassificationSchema.parse(value)).not.toThrow();
  });

  it('rejects unknown classification', () => {
    expect(() => grammarClassificationSchema.parse('typo')).toThrow();
  });
});

describe('grammarErrorTypeSchema', () => {
  it.each([
    'verb_tense',
    'article',
    'preposition',
    'agreement',
    'word_order',
    'other',
  ] as const)('accepts errorType "%s"', (value) => {
    expect(() => grammarErrorTypeSchema.parse(value)).not.toThrow();
  });

  it('rejects unknown errorType', () => {
    expect(() => grammarErrorTypeSchema.parse('spelling')).toThrow();
  });
});

describe('grammarFlagSchema', () => {
  it('validates a well-formed flag', () => {
    const result = grammarFlagSchema.safeParse(makeValidFlag());
    expect(result.success).toBe(true);
  });

  it('accepts null errorType for non-error classifications', () => {
    const flag = makeValidFlag({ classification: 'self_correction', errorType: null });
    expect(grammarFlagSchema.safeParse(flag).success).toBe(true);
  });

  it('accepts null corpusEvidence', () => {
    const flag = makeValidFlag({ corpusEvidence: null });
    expect(grammarFlagSchema.safeParse(flag).success).toBe(true);
  });

  it('accepts a corpusEvidence string', () => {
    const flag = makeValidFlag({ corpusEvidence: 'freq=42.3/M' });
    expect(grammarFlagSchema.safeParse(flag).success).toBe(true);
  });

  it('rejects confidence below 0', () => {
    const flag = makeValidFlag({ confidence: -0.1 });
    expect(grammarFlagSchema.safeParse(flag).success).toBe(false);
  });

  it('rejects confidence above 1', () => {
    const flag = makeValidFlag({ confidence: 1.1 });
    expect(grammarFlagSchema.safeParse(flag).success).toBe(false);
  });

  it('accepts confidence at exact boundaries 0 and 1', () => {
    expect(grammarFlagSchema.safeParse(makeValidFlag({ confidence: 0 })).success).toBe(true);
    expect(grammarFlagSchema.safeParse(makeValidFlag({ confidence: 1 })).success).toBe(true);
  });

  it('rejects negative spanIndex', () => {
    const flag = makeValidFlag({ spanIndex: -1 });
    expect(grammarFlagSchema.safeParse(flag).success).toBe(false);
  });

  it('accepts spanIndex of 0', () => {
    expect(grammarFlagSchema.safeParse(makeValidFlag({ spanIndex: 0 })).success).toBe(true);
  });

  it('rejects non-integer spanIndex', () => {
    const flag = makeValidFlag({ spanIndex: 1.5 });
    expect(grammarFlagSchema.safeParse(flag).success).toBe(false);
  });

  it('rejects missing required field: verbatimText', () => {
    const { verbatimText: _, ...flag } = makeValidFlag();
    expect(grammarFlagSchema.safeParse(flag).success).toBe(false);
  });

  it('rejects missing required field: classification', () => {
    const { classification: _, ...flag } = makeValidFlag();
    expect(grammarFlagSchema.safeParse(flag).success).toBe(false);
  });

  it('rejects missing required field: confidence', () => {
    const { confidence: _, ...flag } = makeValidFlag();
    expect(grammarFlagSchema.safeParse(flag).success).toBe(false);
  });
});

describe('grammarFlagsResponseSchema', () => {
  it('validates a wrapper with an array of flags', () => {
    const payload = { flags: [makeValidFlag()] };
    expect(grammarFlagsResponseSchema.safeParse(payload).success).toBe(true);
  });

  it('validates an empty flags array', () => {
    expect(grammarFlagsResponseSchema.safeParse({ flags: [] }).success).toBe(true);
  });

  it('rejects missing flags property', () => {
    expect(grammarFlagsResponseSchema.safeParse({}).success).toBe(false);
  });

  it('rejects flags that is not an array', () => {
    expect(grammarFlagsResponseSchema.safeParse({ flags: makeValidFlag() }).success).toBe(false);
  });

  it('rejects a flag inside the array that has an invalid field', () => {
    const payload = { flags: [makeValidFlag({ confidence: 2 })] };
    expect(grammarFlagsResponseSchema.safeParse(payload).success).toBe(false);
  });
});
