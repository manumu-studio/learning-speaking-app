// Unit tests for classifyDivergenceSpans — Claude call, JSON parsing, and fence stripping
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/ai/client', () => ({
  getAnthropicClient: vi.fn(() => ({
    messages: { create: vi.fn() },
  })),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { getAnthropicClient } from '@/lib/ai/client';
import { classifyDivergenceSpans } from './classifyDivergenceSpans';
import type { DivergenceSpan } from '@/lib/analysis/divergence';

const makeSpan = (overrides: Partial<DivergenceSpan> = {}): DivergenceSpan => ({
  start: 0,
  end: 1,
  verbatimText: 'goed',
  normalizedText: 'went',
  type: 'substitution',
  confidence: 0.82,
  ...overrides,
});

const makeFlag = () => ({
  spanIndex: 0,
  verbatimText: 'goed',
  normalizedText: 'went',
  classification: 'grammar_error',
  errorType: 'verb_tense',
  confidence: 0.9,
  explanation: 'Wrong past tense.',
  suggestion: 'Use "went".',
  corpusEvidence: null,
});

function getCreateMock() {
  const client = vi.mocked(getAnthropicClient)();
  return vi.mocked(client.messages.create);
}

function mockCreateResponse(text: string) {
  getCreateMock().mockResolvedValue({
    content: [{ type: 'text', text }],
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  // Re-initialize the mock per test so getAnthropicClient always returns a fresh spy
  vi.mocked(getAnthropicClient).mockReturnValue({
    messages: { create: vi.fn() },
  } as never);
});

const classifyOptions = {
  normalizedTranscript: 'I went home.',
  verbatimTranscript: 'I goed home.',
  corpusEvidence: null,
};

describe('classifyDivergenceSpans', () => {
  it('returns [] without calling Claude when divergenceSpans is empty', async () => {
    const result = await classifyDivergenceSpans({ ...classifyOptions, divergenceSpans: [] });

    expect(result).toEqual([]);
    expect(getAnthropicClient).not.toHaveBeenCalled();
  });

  it('returns parsed GrammarFlag[] on a valid JSON response', async () => {
    mockCreateResponse(JSON.stringify({ flags: [makeFlag()] }));

    const result = await classifyDivergenceSpans({
      ...classifyOptions,
      divergenceSpans: [makeSpan()],
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      spanIndex: 0,
      classification: 'grammar_error',
      errorType: 'verb_tense',
      confidence: 0.9,
    });
  });

  it('strips markdown ```json fences before parsing', async () => {
    const raw = '```json\n' + JSON.stringify({ flags: [makeFlag()] }) + '\n```';
    mockCreateResponse(raw);

    const result = await classifyDivergenceSpans({
      ...classifyOptions,
      divergenceSpans: [makeSpan()],
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.classification).toBe('grammar_error');
  });

  it('strips plain ``` fences (no language tag) before parsing', async () => {
    const raw = '```\n' + JSON.stringify({ flags: [makeFlag()] }) + '\n```';
    mockCreateResponse(raw);

    const result = await classifyDivergenceSpans({
      ...classifyOptions,
      divergenceSpans: [makeSpan()],
    });

    expect(result).toHaveLength(1);
  });

  it('throws when the response contains no text block', async () => {
    vi.mocked(getAnthropicClient).mockReturnValue({
      messages: {
        create: vi.fn().mockResolvedValue({ content: [] }),
      },
    } as never);

    await expect(
      classifyDivergenceSpans({ ...classifyOptions, divergenceSpans: [makeSpan()] }),
    ).rejects.toThrow('Grammar classifier returned no text content');
  });

  it('calls Claude with the correct model and passes both transcripts', async () => {
    mockCreateResponse(JSON.stringify({ flags: [makeFlag()] }));

    await classifyDivergenceSpans({
      ...classifyOptions,
      divergenceSpans: [makeSpan()],
    });

    const createMock = getCreateMock();
    expect(createMock).toHaveBeenCalledTimes(1);
    const callArg = createMock.mock.calls[0]?.[0] as { model: string; messages: { content: string }[] };
    expect(callArg.model).toBe('claude-haiku-4-5-20251001');
    expect(callArg.messages[0]?.content).toContain('I went home.');
  });

  it('throws when Claude returns invalid JSON', async () => {
    mockCreateResponse('not-json at all');

    await expect(
      classifyDivergenceSpans({ ...classifyOptions, divergenceSpans: [makeSpan()] }),
    ).rejects.toThrow();
  });

  it('throws when response JSON fails grammarFlagsResponseSchema validation', async () => {
    mockCreateResponse(JSON.stringify({ flags: [{ spanIndex: -1, classification: 'bad' }] }));

    await expect(
      classifyDivergenceSpans({ ...classifyOptions, divergenceSpans: [makeSpan()] }),
    ).rejects.toThrow();
  });

  it('handles multiple spans and returns a flag for each', async () => {
    const secondFlag = { ...makeFlag(), spanIndex: 1, verbatimText: 'the a car', normalizedText: 'a car' };
    mockCreateResponse(JSON.stringify({ flags: [makeFlag(), secondFlag] }));

    const spans = [
      makeSpan(),
      makeSpan({ start: 2, end: 3, verbatimText: 'the a car', normalizedText: 'a car' }),
    ];

    const result = await classifyDivergenceSpans({ ...classifyOptions, divergenceSpans: spans });

    expect(result).toHaveLength(2);
    expect(result[1]?.spanIndex).toBe(1);
  });
});
