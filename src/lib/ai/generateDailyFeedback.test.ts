// Unit tests for generateDailyFeedback — Claude Haiku daily coaching note generation
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/ai/client', () => ({ getAnthropicClient: vi.fn() }));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { generateDailyFeedback } from '@/lib/ai/generateDailyFeedback';
import { getAnthropicClient } from '@/lib/ai/client';

const mockGetAnthropicClient = vi.mocked(getAnthropicClient);

const FALLBACK = 'Great work today! Keep building those reps.';

function makeMessagesCreate(response: unknown) {
  return { messages: { create: vi.fn().mockResolvedValue(response) } };
}

const baseInput = {
  deliveryAvg: 7.5,
  languageAvg: 6.8,
  pronunciationAvg: 7.2,
  sessionCount: 2,
  newWords: [] as string[],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('generateDailyFeedback', () => {
  it('returns coaching feedback string on success', async () => {
    const feedback = 'You crushed delivery today — keep that momentum going!';
    mockGetAnthropicClient.mockReturnValue(
      makeMessagesCreate({ content: [{ type: 'text', text: feedback }] }) as never,
    );

    const result = await generateDailyFeedback(baseInput);

    expect(result).toBe(feedback);
  });

  it('uses claude-haiku-4-5-20251001 model', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'Some feedback.' }],
    });
    mockGetAnthropicClient.mockReturnValue({ messages: { create: mockCreate } } as never);

    await generateDailyFeedback(baseInput);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'claude-haiku-4-5-20251001' }),
    );
  });

  it('returns fallback message when API call fails', async () => {
    mockGetAnthropicClient.mockReturnValue({
      messages: { create: vi.fn().mockRejectedValue(new Error('Network error')) },
    } as never);

    const result = await generateDailyFeedback(baseInput);

    expect(result).toBe(FALLBACK);
  });

  it('returns fallback when response content is not text type', async () => {
    mockGetAnthropicClient.mockReturnValue(
      makeMessagesCreate({ content: [{ type: 'tool_use', id: 'tu_1', name: 'tool', input: {} }] }) as never,
    );

    const result = await generateDailyFeedback(baseInput);

    expect(result).toBe(FALLBACK);
  });

  it('returns fallback when response text is empty', async () => {
    mockGetAnthropicClient.mockReturnValue(
      makeMessagesCreate({ content: [{ type: 'text', text: '   ' }] }) as never,
    );

    const result = await generateDailyFeedback(baseInput);

    expect(result).toBe(FALLBACK);
  });

  it('includes metricHighlight in prompt when provided', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'Good job!' }],
    });
    mockGetAnthropicClient.mockReturnValue({ messages: { create: mockCreate } } as never);

    await generateDailyFeedback({
      ...baseInput,
      metricHighlight: { key: 'vocabularyPrecision', score: 9.2 },
    });

    const callArgs = mockCreate.mock.calls[0] as [{ messages: Array<{ content: string }> }];
    const userContent = callArgs[0].messages[0]?.content ?? '';
    expect(userContent).toContain('vocabularyPrecision');
    expect(userContent).toContain('9.2');
  });

  it('includes metricLow in prompt when provided', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'Keep going!' }],
    });
    mockGetAnthropicClient.mockReturnValue({ messages: { create: mockCreate } } as never);

    await generateDailyFeedback({
      ...baseInput,
      metricLow: { key: 'fillerUsage', score: 4.1 },
    });

    const callArgs = mockCreate.mock.calls[0] as [{ messages: Array<{ content: string }> }];
    const userContent = callArgs[0].messages[0]?.content ?? '';
    expect(userContent).toContain('fillerUsage');
    expect(userContent).toContain('4.1');
  });

  it('includes new words in prompt when provided', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'Nice vocab work!' }],
    });
    mockGetAnthropicClient.mockReturnValue({ messages: { create: mockCreate } } as never);

    await generateDailyFeedback({
      ...baseInput,
      newWords: ['eloquent', 'succinct', 'articulate'],
    });

    const callArgs = mockCreate.mock.calls[0] as [{ messages: Array<{ content: string }> }];
    const userContent = callArgs[0].messages[0]?.content ?? '';
    expect(userContent).toContain('eloquent');
    expect(userContent).toContain('succinct');
    expect(userContent).toContain('articulate');
  });

  it('handles empty newWords array without including vocab line', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'Solid session!' }],
    });
    mockGetAnthropicClient.mockReturnValue({ messages: { create: mockCreate } } as never);

    await generateDailyFeedback({ ...baseInput, newWords: [] });

    const callArgs = mockCreate.mock.calls[0] as [{ messages: Array<{ content: string }> }];
    const userContent = callArgs[0].messages[0]?.content ?? '';
    expect(userContent).not.toContain('New vocabulary');
  });
});
