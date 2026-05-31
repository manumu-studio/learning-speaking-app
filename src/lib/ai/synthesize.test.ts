// Tests for Claude synthesis pass — uses mocked Anthropic client
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/env', () => ({
  env: { ANTHROPIC_API_KEY: 'test-key' },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const mockCreate = vi.fn();
const mockClient = { messages: { create: mockCreate } };

vi.mock('./client', () => ({
  getAnthropicClient: () => mockClient,
}));

import { synthesizeAnalysis } from './synthesize';
import type { SynthesisInput } from './synthesize';

const validSynthesisResponse = {
  insights: [
    {
      category: 'grammar' as const,
      pattern: 'Connector overuse',
      detail: 'Repeated "so" at chunk boundaries',
      frequency: 5,
      severity: 'medium' as const,
      examples: ['so I was saying', 'so then'],
      suggestion: 'Use "therefore" or "consequently" for variety',
    },
  ],
  metrics: [
    { key: 'connectorRepetition' as const, level: 'low' as const, score: 4, note: 'Overuses "so"' },
    { key: 'structuralVariety' as const, level: 'medium' as const, score: 6, note: 'Good overall' },
    { key: 'vocabularyPrecision' as const, level: 'high' as const, score: 8, note: 'Strong word choice' },
    { key: 'verbAccuracy' as const, level: 'high' as const, score: 7, note: 'Mostly accurate' },
    { key: 'argumentClosure' as const, level: 'medium' as const, score: 6, note: 'Decent conclusions' },
    { key: 'fillerUsage' as const, level: 'medium' as const, score: 5, note: 'Some fillers' },
  ],
  focusNext: 'Practice varied connectors',
  summary: 'Good fluency with repetitive connector patterns.',
  intentLabel: 'Daily conversation practice',
};

const buildInput = (overrides: Partial<SynthesisInput> = {}): SynthesisInput => ({
  stitchedTranscript: 'Hello world I was saying so many things.',
  chunks: [
    {
      chunkIndex: 0,
      startSecs: 0,
      endSecs: 120,
      insights: [
        {
          category: 'grammar',
          pattern: 'Connector overuse',
          detail: 'So',
          frequency: 3,
          severity: 'medium',
        },
      ],
    },
    {
      chunkIndex: 1,
      startSecs: 120,
      endSecs: 240,
      insights: [
        {
          category: 'grammar',
          pattern: 'Connector overuse',
          detail: 'So again',
          frequency: 2,
          severity: 'medium',
        },
      ],
    },
  ],
  focusMetricKey: null,
  promptUsed: null,
  ...overrides,
});

describe('synthesizeAnalysis', () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it('calls Claude and returns parsed synthesis result', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify(validSynthesisResponse) }],
    });

    const result = await synthesizeAnalysis(buildInput());

    expect(result.insights).toHaveLength(1);
    expect(result.insights[0]?.pattern).toBe('Connector overuse');
    expect(result.metrics).toHaveLength(6);
    expect(result.focusNext).toBe('Practice varied connectors');
    expect(result.intentLabel).toBe('Daily conversation practice');
  });

  it('strips markdown code fences from Claude response', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [
        { type: 'text', text: `\`\`\`json\n${JSON.stringify(validSynthesisResponse)}\n\`\`\`` },
      ],
    });

    const result = await synthesizeAnalysis(buildInput());
    expect(result.insights).toHaveLength(1);
  });

  it('throws when Claude returns invalid JSON', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'not json at all' }],
    });

    await expect(synthesizeAnalysis(buildInput())).rejects.toThrow('invalid JSON');
  });

  it('throws when Claude response fails schema validation', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify({ insights: 'wrong type' }) }],
    });

    await expect(synthesizeAnalysis(buildInput())).rejects.toThrow('schema validation');
  });

  it('throws when Claude returns no text block', async () => {
    mockCreate.mockResolvedValueOnce({ content: [] });
    await expect(synthesizeAnalysis(buildInput())).rejects.toThrow(
      'Unexpected Claude response structure',
    );
  });

  it('includes focusMetricKey in the prompt when provided', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify(validSynthesisResponse) }],
    });

    await synthesizeAnalysis(buildInput({ focusMetricKey: 'verbAccuracy' }));

    const callArgs = mockCreate.mock.calls[0]?.[0] as {
      messages?: Array<{ content?: string }>;
    };
    expect(callArgs.messages?.[0]?.content).toContain('verbAccuracy');
  });
});
