// Tests for drill evaluation — heuristic and AI paths
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { evaluateDrill } from './evaluateDrill';

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
    drillPrompt: 'Rephrase without using "so"',
    sourceExample: 'I was tired so I went home',
    drillTranscript: 'I was tired, therefore I went home',
    metricKey: 'connectorRepetition',
    metricLabel: 'Connector Repetition',
    ...overrides,
  };
}

describe('evaluateDrill', () => {
  it('returns "No response detected" for empty transcript', async () => {
    const result = await evaluateDrill(baseParams({ drillTranscript: '   ' }));
    expect(result.improved).toBe(false);
    expect(result.feedback).toContain('No response detected');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns improved:true for precision drill with specific details', async () => {
    const result = await evaluateDrill(
      baseParams({
        drillType: 'precision',
        drillTranscript:
          'On Monday, January 15th, I specifically visited 3 different stores in downtown Seattle.',
        metricKey: 'fillerUsage',
        metricLabel: 'Filler Usage',
      })
    );
    expect(result.improved).toBe(true);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns improved:false for precision drill with vague language', async () => {
    const result = await evaluateDrill(
      baseParams({
        drillType: 'precision',
        drillTranscript: 'I did some things and stuff happened at some place.',
        metricKey: 'fillerUsage',
        metricLabel: 'Filler Usage',
      })
    );
    expect(result.improved).toBe(false);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns improved:true for conclusion drill with clear closing', async () => {
    const result = await evaluateDrill(
      baseParams({
        drillType: 'conclusion',
        drillTranscript:
          'Learning a new language requires dedication. Practice every day for best results. In summary, consistency is the most important factor for language acquisition.',
        metricKey: 'argumentClosure',
        metricLabel: 'Argument Closure',
      })
    );
    expect(result.improved).toBe(true);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns improved:false for conclusion drill without conclusion markers', async () => {
    const result = await evaluateDrill(
      baseParams({
        drillType: 'conclusion',
        drillTranscript: 'Languages are interesting. I like them.',
        metricKey: 'argumentClosure',
        metricLabel: 'Argument Closure',
      })
    );
    expect(result.improved).toBe(false);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('parses valid AI feedback for rephrase drill', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '{"feedback":"Great use of however!","improved":true}' }],
    });

    const result = await evaluateDrill(baseParams({ drillType: 'rephrase' }));
    expect(result.improved).toBe(true);
    expect(result.feedback).toBe('Great use of however!');
  });

  it('returns safe fallback when AI returns non-JSON response', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'This is not valid JSON at all' }],
    });

    const result = await evaluateDrill(baseParams({ drillType: 'rephrase' }));
    expect(result.improved).toBe(false);
    expect(result.feedback).toContain('Great effort');
  });
});
