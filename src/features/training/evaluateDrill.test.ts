// Tests for evaluateDrill — heuristic evaluation for precision/conclusion drills
// and Claude Haiku delegation for other types.
// sanitizePromptInput was removed from this module in this PR; tests confirm
// the functions work correctly with raw user input.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/ai/client', () => ({
  getAnthropicClient: vi.fn(),
}));

import { getAnthropicClient } from '@/lib/ai/client';
import { evaluateDrill } from '@/features/training/evaluateDrill';

const mockGetAnthropicClient = getAnthropicClient as ReturnType<typeof vi.fn>;

function makeAnthropicClient(responseText: string) {
  return {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: responseText }],
      }),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Empty transcript ─────────────────────────────────────────────────────────

describe('evaluateDrill — empty transcript', () => {
  it('returns not-improved with prompt-to-retry feedback when transcript is empty', async () => {
    const result = await evaluateDrill({
      drillType: 'precision',
      drillPrompt: 'Be more specific',
      sourceExample: null,
      drillTranscript: '',
      metricKey: 'precision',
      metricLabel: 'Precision',
    });

    expect(result.improved).toBe(false);
    expect(result.feedback).toContain('No response detected');
  });

  it('returns not-improved for whitespace-only transcript', async () => {
    const result = await evaluateDrill({
      drillType: 'conclusion',
      drillPrompt: 'Add a conclusion',
      sourceExample: null,
      drillTranscript: '   ',
      metricKey: 'conclusion',
      metricLabel: 'Conclusion',
    });

    expect(result.improved).toBe(false);
    expect(result.feedback).toContain('No response detected');
  });
});

// ─── Precision drill — heuristic evaluation ───────────────────────────────────

describe('evaluateDrill — precision drill', () => {
  it('marks improved when transcript has two specificity signals and no vague markers', async () => {
    const result = await evaluateDrill({
      drillType: 'precision',
      drillPrompt: 'Be more specific',
      sourceExample: null,
      drillTranscript: 'I met specifically 15 people at the conference on Monday.',
      metricKey: 'precision',
      metricLabel: 'Precision',
    });

    expect(result.improved).toBe(true);
    expect(result.feedback).toContain('specific');
  });

  it('marks not improved when transcript lacks specificity signals', async () => {
    const result = await evaluateDrill({
      drillType: 'precision',
      drillPrompt: 'Be more specific',
      sourceExample: null,
      drillTranscript: 'I talked about things and stuff.',
      metricKey: 'precision',
      metricLabel: 'Precision',
    });

    expect(result.improved).toBe(false);
  });

  it('marks not improved when transcript has signals but also vague markers', async () => {
    // Has two signals (number + month) but also "kind of" vague marker
    const result = await evaluateDrill({
      drillType: 'precision',
      drillPrompt: 'Be more specific',
      sourceExample: null,
      drillTranscript: 'It was kind of like 12 events in January.',
      metricKey: 'precision',
      metricLabel: 'Precision',
    });

    expect(result.improved).toBe(false);
  });

  it('marks improved when transcript has a number and a day-of-week signal', async () => {
    const result = await evaluateDrill({
      drillType: 'precision',
      drillPrompt: 'Add details',
      sourceExample: null,
      drillTranscript: 'We completed 7 tasks on Friday afternoon.',
      metricKey: 'precision',
      metricLabel: 'Precision',
    });

    expect(result.improved).toBe(true);
  });

  it('does not call the Anthropic client for precision drills', async () => {
    await evaluateDrill({
      drillType: 'precision',
      drillPrompt: 'Be specific',
      sourceExample: null,
      drillTranscript: 'I sold 20 units in March specifically.',
      metricKey: 'precision',
      metricLabel: 'Precision',
    });

    expect(mockGetAnthropicClient).not.toHaveBeenCalled();
  });
});

// ─── Conclusion drill — heuristic evaluation ─────────────────────────────────

describe('evaluateDrill — conclusion drill', () => {
  it('marks improved when transcript has a conclusion marker and at least 3 sentences', async () => {
    const result = await evaluateDrill({
      drillType: 'conclusion',
      drillPrompt: 'Add a strong conclusion',
      sourceExample: null,
      drillTranscript:
        'I started the project in January. We delivered on time. In summary, it was a success.',
      metricKey: 'conclusion',
      metricLabel: 'Conclusion',
    });

    expect(result.improved).toBe(true);
    expect(result.feedback).toContain('finish');
  });

  it('marks not improved when transcript lacks a conclusion marker', async () => {
    const result = await evaluateDrill({
      drillType: 'conclusion',
      drillPrompt: 'Add a strong conclusion',
      sourceExample: null,
      drillTranscript:
        'I started the project in January. We delivered on time. Everything went well.',
      metricKey: 'conclusion',
      metricLabel: 'Conclusion',
    });

    expect(result.improved).toBe(false);
  });

  it('marks not improved when transcript has a marker but fewer than 3 sentences', async () => {
    const result = await evaluateDrill({
      drillType: 'conclusion',
      drillPrompt: 'Add a strong conclusion',
      sourceExample: null,
      drillTranscript: 'In summary, the project was great.',
      metricKey: 'conclusion',
      metricLabel: 'Conclusion',
    });

    expect(result.improved).toBe(false);
  });

  it('accepts "the key takeaway" as a valid conclusion marker', async () => {
    const result = await evaluateDrill({
      drillType: 'conclusion',
      drillPrompt: 'Wrap up',
      sourceExample: null,
      drillTranscript:
        'First point here. Second important thing. Third point made. The key takeaway is that effort matters.',
      metricKey: 'conclusion',
      metricLabel: 'Conclusion',
    });

    expect(result.improved).toBe(true);
  });

  it('does not call the Anthropic client for conclusion drills', async () => {
    await evaluateDrill({
      drillType: 'conclusion',
      drillPrompt: 'Add conclusion',
      sourceExample: null,
      drillTranscript: 'Point one. Point two. Point three. To conclude, it was good.',
      metricKey: 'conclusion',
      metricLabel: 'Conclusion',
    });

    expect(mockGetAnthropicClient).not.toHaveBeenCalled();
  });
});

// ─── Rephrase drill — Claude evaluation ──────────────────────────────────────

describe('evaluateDrill — rephrase drill (Claude Haiku)', () => {
  it('returns parsed feedback from Claude response', async () => {
    mockGetAnthropicClient.mockReturnValue(
      makeAnthropicClient('{ "feedback": "Great rephrase!", "improved": true }')
    );

    const result = await evaluateDrill({
      drillType: 'rephrase',
      drillPrompt: 'Rephrase without "so"',
      sourceExample: 'So I went to the store.',
      drillTranscript: 'I headed to the store.',
      metricKey: 'connector_variety',
      metricLabel: 'Connector variety',
    });

    expect(result.feedback).toBe('Great rephrase!');
    expect(result.improved).toBe(true);
  });

  it('returns fallback when Claude returns malformed JSON', async () => {
    mockGetAnthropicClient.mockReturnValue(makeAnthropicClient('not valid json at all'));

    const result = await evaluateDrill({
      drillType: 'rephrase',
      drillPrompt: 'Rephrase without "so"',
      sourceExample: null,
      drillTranscript: 'I went to the store anyway.',
      metricKey: 'connector_variety',
      metricLabel: 'Connector variety',
    });

    expect(result.improved).toBe(false);
    expect(result.feedback).toContain('effort');
  });

  it('strips JSON code fences from Claude response before parsing', async () => {
    mockGetAnthropicClient.mockReturnValue(
      makeAnthropicClient('```json\n{ "feedback": "Good job!", "improved": false }\n```')
    );

    const result = await evaluateDrill({
      drillType: 'rephrase',
      drillPrompt: 'Rephrase',
      sourceExample: null,
      drillTranscript: 'I rephrase using different words here.',
      metricKey: 'connector_variety',
      metricLabel: 'Connector variety',
    });

    expect(result.feedback).toBe('Good job!');
    expect(result.improved).toBe(false);
  });

  it('passes sourceExample in the prompt when provided', async () => {
    const client = makeAnthropicClient('{ "feedback": "Nice work", "improved": true }');
    mockGetAnthropicClient.mockReturnValue(client);

    await evaluateDrill({
      drillType: 'rephrase',
      drillPrompt: 'Rephrase this',
      sourceExample: 'So basically things happened.',
      drillTranscript: 'Essentially several events occurred.',
      metricKey: 'connector_variety',
      metricLabel: 'Connector variety',
    });

    const promptArg: string = client.messages.create.mock.calls[0][0].messages[0].content;
    expect(promptArg).toContain('So basically things happened.');
  });

  it('omits source example block from prompt when sourceExample is null', async () => {
    const client = makeAnthropicClient('{ "feedback": "Keep going!", "improved": false }');
    mockGetAnthropicClient.mockReturnValue(client);

    await evaluateDrill({
      drillType: 'rephrase',
      drillPrompt: 'Rephrase',
      sourceExample: null,
      drillTranscript: 'I went to the place.',
      metricKey: 'connector_variety',
      metricLabel: 'Connector variety',
    });

    const promptArg: string = client.messages.create.mock.calls[0][0].messages[0].content;
    expect(promptArg).not.toContain('original problematic sentence');
  });
});

// ─── Regression: raw user input accepted (sanitization removed) ───────────────

describe('evaluateDrill — handles raw user input without sanitization', () => {
  it('precision drill works with raw backticks and angle brackets in transcript', async () => {
    const result = await evaluateDrill({
      drillType: 'precision',
      drillPrompt: 'Be precise',
      sourceExample: null,
      drillTranscript: 'I sold exactly 10 units on `Monday` <specifically>.',
      metricKey: 'precision',
      metricLabel: 'Precision',
    });

    // Should still evaluate correctly (has number + day signal, no vague markers)
    expect(result.improved).toBe(true);
  });

  it('conclusion drill works with raw special characters in transcript', async () => {
    const result = await evaluateDrill({
      drillType: 'conclusion',
      drillPrompt: 'Add conclusion',
      sourceExample: null,
      drillTranscript:
        'Point <one>. Point "two". Third point here. In summary, it worked well.',
      metricKey: 'conclusion',
      metricLabel: 'Conclusion',
    });

    expect(result.improved).toBe(true);
  });
});