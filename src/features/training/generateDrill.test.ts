// Tests for drill prompt generation — template and AI paths
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateDrill } from './generateDrill';

const mockCreate = vi.fn();
vi.mock('@/lib/ai/client', () => ({
  getAnthropicClient: () => ({
    messages: { create: mockCreate },
  }),
}));

vi.mock('@/lib/sanitizePromptInput', () => ({
  sanitizePromptInput: (input: string) => input,
}));

beforeEach(() => {
  mockCreate.mockReset();
});

function baseParams(overrides: Record<string, unknown> = {}) {
  return {
    drillType: 'rephrase' as const,
    metricKey: 'connectorRepetition',
    recentExamples: ['I went to the store so I bought milk', 'It was raining so I took an umbrella'],
    focusPattern: 'Overuses "so" as connector',
    ...overrides,
  };
}

describe('generateDrill', () => {
  it('generates precision drill from template without calling Anthropic', async () => {
    const result = await generateDrill(
      baseParams({
        drillType: 'precision',
        metricKey: 'fillerUsage',
        sessionTranscript: 'I did some things and stuff happened at that place',
      })
    );

    expect(result.drillType).toBe('precision');
    expect(result.metricKey).toBe('fillerUsage');
    expect(result.prompt).toBeTruthy();
    expect(result.timeLimit).toBe(60);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('generates conclusion drill from template without calling Anthropic', async () => {
    const result = await generateDrill(
      baseParams({
        drillType: 'conclusion',
        metricKey: 'argumentClosure',
        intentLabel: 'Climate change debate',
      })
    );

    expect(result.drillType).toBe('conclusion');
    expect(result.metricKey).toBe('argumentClosure');
    expect(result.prompt).toContain('Climate change debate');
    expect(result.timeLimit).toBe(120);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('generates rephrase drill via Anthropic client', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'Try saying it with "however" instead of "so".' }],
    });

    const result = await generateDrill(baseParams({ drillType: 'rephrase' }));

    expect(result.drillType).toBe('rephrase');
    expect(result.prompt).toContain('however');
    expect(result.timeLimit).toBe(90);
    expect(mockCreate).toHaveBeenCalledOnce();
  });

  it('generates vocabUpgrade drill via Anthropic client', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: 'text',
          text: 'Replace "good" with "effective", "beneficial", or "advantageous".',
        },
      ],
    });

    const result = await generateDrill(
      baseParams({
        drillType: 'vocabUpgrade',
        metricKey: 'vocabularyPrecision',
      })
    );

    expect(result.drillType).toBe('vocabUpgrade');
    expect(result.timeLimit).toBe(60);
    expect(result.sourceExample).toBe('I went to the store so I bought milk');
    expect(mockCreate).toHaveBeenCalledOnce();
  });

  it('handles empty content array from Anthropic gracefully', async () => {
    mockCreate.mockResolvedValueOnce({ content: [] });

    const result = await generateDrill(baseParams({ drillType: 'rephrase' }));

    expect(result.drillType).toBe('rephrase');
    expect(result.prompt).toBe('');
  });
});
