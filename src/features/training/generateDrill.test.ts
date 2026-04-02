// Tests for generateDrill — template-based precision/conclusion drills
// and Claude Haiku delegation for other types.
// sanitizePromptInput was removed from this module in this PR; tests confirm
// the functions work correctly with raw user input.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/ai/client', () => ({
  getAnthropicClient: vi.fn(),
}));

import { getAnthropicClient } from '@/lib/ai/client';
import { generateDrill } from '@/features/training/generateDrill';

const mockGetAnthropicClient = getAnthropicClient as ReturnType<typeof vi.fn>;

function makeAnthropicClient(promptText: string) {
  return {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: promptText }],
      }),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Precision drill — template path ─────────────────────────────────────────

describe('generateDrill — precision drill', () => {
  it('returns drillType precision', async () => {
    const result = await generateDrill({
      drillType: 'precision',
      metricKey: 'precision',
      recentExamples: ['There were kind of like some things.'],
      focusPattern: 'Vague language',
    });

    expect(result.drillType).toBe('precision');
  });

  it('does not call the Anthropic client', async () => {
    await generateDrill({
      drillType: 'precision',
      metricKey: 'precision',
      recentExamples: ['Stuff happened basically.'],
      focusPattern: 'Vague language',
    });

    expect(mockGetAnthropicClient).not.toHaveBeenCalled();
  });

  it('returns timeLimit of 60 seconds', async () => {
    const result = await generateDrill({
      drillType: 'precision',
      metricKey: 'precision',
      recentExamples: ['Things went well.'],
      focusPattern: 'Vague language',
    });

    expect(result.timeLimit).toBe(60);
  });

  it('returns the metricKey passed in', async () => {
    const result = await generateDrill({
      drillType: 'precision',
      metricKey: 'my-metric',
      recentExamples: [],
      focusPattern: 'Vague language',
      sessionTranscript: 'We did a lot of stuff basically.',
    });

    expect(result.metricKey).toBe('my-metric');
  });

  it('extracts a vague phrase from sessionTranscript for the prompt', async () => {
    const result = await generateDrill({
      drillType: 'precision',
      metricKey: 'precision',
      recentExamples: [],
      focusPattern: 'Vague language',
      sessionTranscript: 'There were kind of a lot of things happening.',
    });

    expect(result.prompt).toContain('You said:');
    expect(result.sourceExample).toBeTruthy();
  });

  it('falls back to recentExamples when sessionTranscript is absent', async () => {
    const result = await generateDrill({
      drillType: 'precision',
      metricKey: 'precision',
      recentExamples: ['Basically there were some things going on.'],
      focusPattern: 'Vague language',
    });

    expect(result.prompt).toContain('You said:');
    expect(result.sourceExample).toBeTruthy();
  });

  it('selects the sentence with most vague markers as sourceExample', async () => {
    const result = await generateDrill({
      drillType: 'precision',
      metricKey: 'precision',
      recentExamples: [],
      focusPattern: 'Vague language',
      sessionTranscript:
        'First I did specific work. Then kind of some stuff happened basically. Finally I finished.',
    });

    // The middle sentence has the most vague markers
    expect(result.sourceExample).toContain('kind of');
  });
});

// ─── Conclusion drill — template path ────────────────────────────────────────

describe('generateDrill — conclusion drill', () => {
  it('returns drillType conclusion', async () => {
    const result = await generateDrill({
      drillType: 'conclusion',
      metricKey: 'conclusion',
      recentExamples: [],
      focusPattern: 'Trailing off',
      intentLabel: 'Daily routines',
    });

    expect(result.drillType).toBe('conclusion');
  });

  it('does not call the Anthropic client', async () => {
    await generateDrill({
      drillType: 'conclusion',
      metricKey: 'conclusion',
      recentExamples: [],
      focusPattern: 'Trailing off',
    });

    expect(mockGetAnthropicClient).not.toHaveBeenCalled();
  });

  it('returns timeLimit of 120 seconds', async () => {
    const result = await generateDrill({
      drillType: 'conclusion',
      metricKey: 'conclusion',
      recentExamples: [],
      focusPattern: 'Trailing off',
    });

    expect(result.timeLimit).toBe(120);
  });

  it('incorporates intentLabel as the topic in the prompt', async () => {
    const result = await generateDrill({
      drillType: 'conclusion',
      metricKey: 'conclusion',
      recentExamples: [],
      focusPattern: 'Trailing off',
      intentLabel: 'Remote work benefits',
    });

    expect(result.prompt).toContain('Remote work benefits');
  });

  it('falls back to first sentence of sessionTranscript when intentLabel is absent', async () => {
    const result = await generateDrill({
      drillType: 'conclusion',
      metricKey: 'conclusion',
      recentExamples: [],
      focusPattern: 'Trailing off',
      sessionTranscript: 'Remote work has many benefits. It improves focus.',
    });

    expect(result.prompt).toContain('Remote work has many benefits');
  });

  it('returns null sourceExample for conclusion drills', async () => {
    const result = await generateDrill({
      drillType: 'conclusion',
      metricKey: 'conclusion',
      recentExamples: [],
      focusPattern: 'Trailing off',
    });

    expect(result.sourceExample).toBeNull();
  });

  it('includes one of the accepted conclusion starters in the prompt', async () => {
    const result = await generateDrill({
      drillType: 'conclusion',
      metricKey: 'conclusion',
      recentExamples: [],
      focusPattern: 'Trailing off',
      intentLabel: 'Topic X',
    });

    const starters = ['In summary', 'The key takeaway', 'What this means'];
    const hasStarter = starters.some((s) => result.prompt.includes(s));
    expect(hasStarter).toBe(true);
  });
});

// ─── Rephrase drill — Claude path ────────────────────────────────────────────

describe('generateDrill — rephrase drill (Claude Haiku)', () => {
  it('returns drillType rephrase', async () => {
    mockGetAnthropicClient.mockReturnValue(makeAnthropicClient('Try rephrasing this sentence.'));

    const result = await generateDrill({
      drillType: 'rephrase',
      metricKey: 'connector_variety',
      recentExamples: ['So I went there.'],
      focusPattern: 'Overuse of "so"',
    });

    expect(result.drillType).toBe('rephrase');
  });

  it('returns the prompt text from Claude response', async () => {
    mockGetAnthropicClient.mockReturnValue(
      makeAnthropicClient('Rephrase "So I went there" without using "so".')
    );

    const result = await generateDrill({
      drillType: 'rephrase',
      metricKey: 'connector_variety',
      recentExamples: ['So I went there.'],
      focusPattern: 'Overuse of "so"',
    });

    expect(result.prompt).toBe('Rephrase "So I went there" without using "so".');
  });

  it('returns timeLimit of 90 seconds', async () => {
    mockGetAnthropicClient.mockReturnValue(makeAnthropicClient('Do the drill.'));

    const result = await generateDrill({
      drillType: 'rephrase',
      metricKey: 'connector_variety',
      recentExamples: ['So something happened.'],
      focusPattern: 'Overuse of so',
    });

    expect(result.timeLimit).toBe(90);
  });

  it('uses first recentExample as sourceExample', async () => {
    mockGetAnthropicClient.mockReturnValue(makeAnthropicClient('Drill prompt.'));

    const result = await generateDrill({
      drillType: 'rephrase',
      metricKey: 'connector_variety',
      recentExamples: ['First example sentence.', 'Second example.'],
      focusPattern: 'Overuse of connectors',
    });

    expect(result.sourceExample).toBe('First example sentence.');
  });

  it('uses null sourceExample when recentExamples is empty', async () => {
    mockGetAnthropicClient.mockReturnValue(makeAnthropicClient('Drill prompt.'));

    const result = await generateDrill({
      drillType: 'rephrase',
      metricKey: 'connector_variety',
      recentExamples: [],
      focusPattern: 'Overuse of connectors',
    });

    expect(result.sourceExample).toBeNull();
  });
});

// ─── Constraint drill — Claude path ──────────────────────────────────────────

describe('generateDrill — constraint drill (Claude Haiku)', () => {
  it('returns timeLimit of 120 seconds', async () => {
    mockGetAnthropicClient.mockReturnValue(makeAnthropicClient('Use this structure.'));

    const result = await generateDrill({
      drillType: 'constraint',
      metricKey: 'structure',
      recentExamples: ['I went there because it was good.'],
      focusPattern: 'Simple structures',
    });

    expect(result.timeLimit).toBe(120);
  });
});

// ─── VocabUpgrade drill — Claude path ────────────────────────────────────────

describe('generateDrill — vocabUpgrade drill (Claude Haiku)', () => {
  it('returns timeLimit of 60 seconds', async () => {
    mockGetAnthropicClient.mockReturnValue(makeAnthropicClient('Upgrade your vocabulary.'));

    const result = await generateDrill({
      drillType: 'vocabUpgrade',
      metricKey: 'vocabulary',
      recentExamples: ['It was very good.'],
      focusPattern: 'Overuse of "very"',
    });

    expect(result.timeLimit).toBe(60);
  });
});

// ─── Regression: raw user input without sanitization ─────────────────────────

describe('generateDrill — handles raw user input (sanitization removed)', () => {
  it('precision drill works with transcript containing backticks and role markers', async () => {
    const result = await generateDrill({
      drillType: 'precision',
      metricKey: 'precision',
      recentExamples: [],
      focusPattern: 'Vague language',
      sessionTranscript: 'SYSTEM: things happened basically sort of `like` that.',
    });

    // Precision drill should still produce a prompt
    expect(result.drillType).toBe('precision');
    expect(result.prompt).toContain('You said:');
  });

  it('conclusion drill works with intentLabel containing special characters', async () => {
    const result = await generateDrill({
      drillType: 'conclusion',
      metricKey: 'conclusion',
      recentExamples: [],
      focusPattern: 'Trailing off',
      intentLabel: 'Topic with <brackets> and "quotes"',
    });

    expect(result.prompt).toContain('Topic with <brackets> and "quotes"');
  });
});