// Unit tests for renderConclusionNarrative — Claude Haiku coaching narrative + topic sentence rendering

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/ai/client', () => ({
  getAnthropicClient: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { renderConclusionNarrative, buildFallbackTopicSentence } from './renderConclusionNarrative';
import { getAnthropicClient } from '@/lib/ai/client';

const FALLBACK_FEEDBACK = 'Great work today! Keep building those reps.';

const baseInput = {
  pillarScores: { delivery: 7.5, language: 6.8, pronunciation: 7.2 },
  metricDeltas: { delivery: 0.3, language: null, pronunciation: -0.1 },
  wins: [{ tag: 'connector_variety', detail: 'Used 5 different connectors' }],
  struggles: [{ tag: 'filler_usage', detail: 'Used "um" 8 times', count: 8 }],
  intentLabels: ['business idioms', 'negotiation strategies'],
  sessionCount: 2,
  totalDurationSecs: 720,
};

function makeSuccessResponse(renderedFeedback: string, topicSentence: string) {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ renderedFeedback, topicSentence }),
      },
    ],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('renderConclusionNarrative', () => {
  it('returns renderedFeedback and topicSentence on successful AI call', async () => {
    const mockCreate = vi.fn().mockResolvedValue(
      makeSuccessResponse(
        'Solid session today! Your delivery is trending up — keep that momentum.',
        'We covered business idioms and negotiation strategies.',
      ),
    );
    vi.mocked(getAnthropicClient).mockReturnValue({
      messages: { create: mockCreate },
    } as never);

    const result = await renderConclusionNarrative(baseInput);

    expect(result.renderedFeedback).toBe(
      'Solid session today! Your delivery is trending up — keep that momentum.',
    );
    expect(result.topicSentence).toBe(
      'We covered business idioms and negotiation strategies.',
    );
  });

  it('returns fallback when AI returns invalid JSON', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'This is not JSON at all.' }],
    });
    vi.mocked(getAnthropicClient).mockReturnValue({
      messages: { create: mockCreate },
    } as never);

    const result = await renderConclusionNarrative(baseInput);

    expect(result.renderedFeedback).toBe(FALLBACK_FEEDBACK);
    expect(result.topicSentence).toBe('We covered business idioms, and negotiation strategies.');
  });

  it('returns fallback when AI call throws an error', async () => {
    const mockCreate = vi.fn().mockRejectedValue(new Error('Network timeout'));
    vi.mocked(getAnthropicClient).mockReturnValue({
      messages: { create: mockCreate },
    } as never);

    const result = await renderConclusionNarrative(baseInput);

    expect(result.renderedFeedback).toBe(FALLBACK_FEEDBACK);
    expect(typeof result.topicSentence).toBe('string');
    expect(result.topicSentence.length).toBeGreaterThan(0);
  });

  it('returns fallback when AI returns JSON missing required fields', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({ onlyOneField: 'partial' }) }],
    });
    vi.mocked(getAnthropicClient).mockReturnValue({
      messages: { create: mockCreate },
    } as never);

    const result = await renderConclusionNarrative(baseInput);

    expect(result.renderedFeedback).toBe(FALLBACK_FEEDBACK);
  });

  it('never throws even on completely unexpected errors', async () => {
    vi.mocked(getAnthropicClient).mockImplementation(() => {
      throw new Error('Client init failed');
    });

    await expect(renderConclusionNarrative(baseInput)).resolves.toMatchObject({
      renderedFeedback: FALLBACK_FEEDBACK,
    });
  });
});

describe('buildFallbackTopicSentence', () => {
  it('joins three labels with commas and "and"', () => {
    const result = buildFallbackTopicSentence(['idioms', 'strategies', 'routines']);
    expect(result).toBe('We covered idioms, strategies, and routines.');
  });

  it('joins two labels with "and"', () => {
    const result = buildFallbackTopicSentence(['business idioms', 'negotiation strategies']);
    expect(result).toBe('We covered business idioms, and negotiation strategies.');
  });

  it('handles a single label', () => {
    const result = buildFallbackTopicSentence(['storytelling']);
    expect(result).toBe('We covered storytelling.');
  });

  it('returns default sentence for empty labels', () => {
    const result = buildFallbackTopicSentence([]);
    expect(result).toBe('We practiced speaking today.');
  });

  it('deduplicates labels before joining', () => {
    const result = buildFallbackTopicSentence(['idioms', 'idioms', 'grammar']);
    expect(result).toBe('We covered idioms, and grammar.');
  });
});
