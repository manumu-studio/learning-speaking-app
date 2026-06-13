// Tests for the eval golden-set boundary schema and judged-metric constants.
import { describe, it, expect } from 'vitest';
import { AzureRawJsonSchema, JUDGED_METRIC_KEYS } from './golden.types';

const validAzureRawJson = {
  pronScore: 82,
  accuracyScore: 80,
  fluencyScore: 85,
  completenessScore: 100,
  prosodyScore: 78,
  words: [
    {
      word: 'hello',
      accuracyScore: 90,
      errorType: 'None',
      offsetMs: 0,
      durationMs: 320,
      phonemes: [
        { phoneme: 'h', accuracyScore: 88 },
        { phoneme: 'ə', accuracyScore: 92 },
      ],
      l1Tags: [],
    },
  ],
  rawUtterances: [{ any: 'shape' }],
};

describe('AzureRawJsonSchema', () => {
  it('accepts a well-formed frozen Azure payload', () => {
    const parsed = AzureRawJsonSchema.safeParse(validAzureRawJson);
    expect(parsed.success).toBe(true);
  });

  it('accepts a payload with optional word fields omitted', () => {
    const minimalWord = {
      ...validAzureRawJson,
      words: [
        {
          word: 'x',
          accuracyScore: 50,
          errorType: 'Mispronunciation',
          offsetMs: 10,
          durationMs: 100,
          phonemes: [],
        },
      ],
    };
    expect(AzureRawJsonSchema.safeParse(minimalWord).success).toBe(true);
  });

  it('rejects a payload missing a required top-level score', () => {
    const { pronScore: _omitted, ...missingScore } = validAzureRawJson;
    expect(AzureRawJsonSchema.safeParse(missingScore).success).toBe(false);
  });

  it('rejects a payload whose words array is absent', () => {
    const { words: _omitted, ...noWords } = validAzureRawJson;
    expect(AzureRawJsonSchema.safeParse(noWords).success).toBe(false);
  });

  it('rejects a malformed phoneme (missing accuracyScore)', () => {
    const badPhoneme = {
      ...validAzureRawJson,
      words: [
        {
          ...validAzureRawJson.words[0],
          phonemes: [{ phoneme: 'h' }],
        },
      ],
    };
    expect(AzureRawJsonSchema.safeParse(badPhoneme).success).toBe(false);
  });
});

describe('JUDGED_METRIC_KEYS', () => {
  it('contains exactly the seven LLM-judged metrics', () => {
    expect(JUDGED_METRIC_KEYS).toHaveLength(7);
    expect([...JUDGED_METRIC_KEYS]).toEqual([
      'connectorRepetition',
      'structuralVariety',
      'vocabularyPrecision',
      'verbAccuracy',
      'argumentClosure',
      'lexicalSophistication',
      'registerPragmatics',
    ]);
  });

  it('excludes the deterministic and Azure-passthrough metrics', () => {
    const keys: readonly string[] = JUDGED_METRIC_KEYS;
    expect(keys).not.toContain('fillerUsage');
    expect(keys).not.toContain('speakingRate');
    expect(keys).not.toContain('pronunciationAccuracy');
    expect(keys).not.toContain('prosodyScore');
  });
});
