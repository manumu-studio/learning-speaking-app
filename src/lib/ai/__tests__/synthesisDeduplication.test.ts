// Tests for synthesis deduplication and error handling
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { synthesizeAnalysis } from '../synthesize';
import type { SynthesisInput } from '../synthesize';

vi.mock('../client', () => ({
  getAnthropicClient: vi.fn(),
}));

import { getAnthropicClient } from '../client';

const mockCreate = vi.fn();
vi.mocked(getAnthropicClient).mockReturnValue({
  messages: { create: mockCreate },
} as unknown as ReturnType<typeof getAnthropicClient>);

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const baseInput: SynthesisInput = {
  stitchedTranscript: 'I was saying so the thing is so basically yes.',
  chunks: [
    {
      chunkIndex: 0,
      startSecs: 0,
      endSecs: 120,
      insights: [
        { category: 'grammar', pattern: 'Filler overuse', detail: '"so" used 3x', frequency: 3, severity: 'medium' },
      ],
    },
    {
      chunkIndex: 1,
      startSecs: 120,
      endSecs: 240,
      insights: [
        { category: 'grammar', pattern: 'Filler overuse', detail: '"so" used 2x', frequency: 2, severity: 'medium' },
      ],
    },
  ],
  focusMetricKey: null,
  promptUsed: null,
};

const validResponse = {
  insights: [
    {
      category: 'grammar',
      pattern: 'Filler overuse',
      detail: 'Uses "so" as a filler word repeatedly across the session',
      frequency: 5,
      severity: 'medium',
      examples: ['so the thing is', 'so basically'],
      suggestion: 'Replace with pauses or "consequently"',
    },
  ],
  metrics: [
    { key: 'connectorRepetition', level: 'low', score: 3, note: '"So" overused' },
    { key: 'structuralVariety', level: 'medium', score: 6, note: 'Decent' },
    { key: 'vocabularyPrecision', level: 'high', score: 7, note: 'Good' },
    { key: 'verbAccuracy', level: 'high', score: 8, note: 'Accurate' },
    { key: 'argumentClosure', level: 'medium', score: 5, note: 'Needs work' },
    { key: 'fillerUsage', level: 'low', score: 4, note: 'High fillers' },
  ],
  focusNext: 'Reduce filler words',
  summary: 'Good vocabulary but filler overuse.',
  intentLabel: 'Casual conversation',
};

describe('Synthesis deduplication and resilience', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns merged insight with combined frequency from duplicate chunks', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify(validResponse) }],
    });

    const result = await synthesizeAnalysis(baseInput);

    expect(result.insights[0]?.frequency).toBe(5);
    expect(result.insights[0]?.pattern).toBe('Filler overuse');
  });

  it('prompt contains both chunk insight arrays', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify(validResponse) }],
    });

    await synthesizeAnalysis(baseInput);

    const callArgs = mockCreate.mock.calls[0]?.[0] as { messages?: Array<{ content: string }> } | undefined;
    const promptContent = callArgs?.messages?.[0]?.content ?? '';
    expect(promptContent).toContain('Chunk 0');
    expect(promptContent).toContain('Chunk 1');
    expect(promptContent).toContain('Filler overuse');
  });

  it('prompt instructs deduplication and boundary artifact filtering', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify(validResponse) }],
    });

    await synthesizeAnalysis(baseInput);

    const callArgs = mockCreate.mock.calls[0]?.[0] as { messages?: Array<{ content: string }> } | undefined;
    const promptContent = callArgs?.messages?.[0]?.content ?? '';
    expect(promptContent.toLowerCase()).toContain('deduplic');
    expect(promptContent.toLowerCase()).toContain('artifact');
  });

  it('handles empty insights array from a chunk gracefully', async () => {
    const inputWithEmptyChunks: SynthesisInput = {
      ...baseInput,
      chunks: [
        { chunkIndex: 0, startSecs: 0, endSecs: 120, insights: [] },
        { chunkIndex: 1, startSecs: 120, endSecs: 240, insights: [] },
      ],
    };

    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify({ ...validResponse, insights: [] }) }],
    });

    const result = await synthesizeAnalysis(inputWithEmptyChunks);
    expect(result.insights).toHaveLength(0);
    expect(result.metrics).toHaveLength(6);
  });

  it('throws when Claude returns non-JSON', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'I cannot complete this request.' }],
    });

    await expect(synthesizeAnalysis(baseInput)).rejects.toThrow('invalid JSON');
  });
});
