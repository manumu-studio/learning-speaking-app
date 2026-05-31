// Tests for reading practice text generation with mocked Claude client

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/env', () => ({
  env: { NODE_ENV: 'test', ANTHROPIC_API_KEY: 'test-key' },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const mockCreate = vi.fn();

vi.mock('@/lib/ai/client', () => ({
  getAnthropicClient: () => ({
    messages: { create: mockCreate },
  }),
}));

import { generateReadingPractice } from './generateReadingPractice';

describe('generateReadingPractice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns parsed text with targets', async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            text: 'The thick theory thrived through thorough thinking.',
            targetPhonemes: ['th', 'r'],
            targetWords: ['thorough'],
          }),
        },
      ],
    });

    const result = await generateReadingPractice({
      weakPhonemes: ['th', 'r'],
      weakVocabulary: ['thorough'],
      difficulty: 'intermediate',
    });

    expect(result.text).toContain('thorough');
    expect(result.targetPhonemes).toEqual(['th', 'r']);
    expect(result.targetWords).toEqual(['thorough']);
  });

  it('strips markdown code fences from response', async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: '```json\n{"text": "Hello world.", "targetPhonemes": [], "targetWords": []}\n```',
        },
      ],
    });

    const result = await generateReadingPractice({
      weakPhonemes: [],
      weakVocabulary: [],
      difficulty: 'beginner',
    });

    expect(result.text).toBe('Hello world.');
  });

  it('throws on non-text response', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'tool_use', id: 'x' }],
    });

    await expect(
      generateReadingPractice({
        weakPhonemes: [],
        weakVocabulary: [],
        difficulty: 'beginner',
      }),
    ).rejects.toThrow('non-text response');
  });

  it('throws on invalid JSON', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'not valid json' }],
    });

    await expect(
      generateReadingPractice({
        weakPhonemes: [],
        weakVocabulary: [],
        difficulty: 'beginner',
      }),
    ).rejects.toThrow();
  });

  it('works with all difficulty levels', async () => {
    const mockResponse = {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            text: 'Test text.',
            targetPhonemes: [],
            targetWords: [],
          }),
        },
      ],
    };

    for (const difficulty of ['beginner', 'intermediate', 'advanced'] as const) {
      mockCreate.mockResolvedValue(mockResponse);
      const result = await generateReadingPractice({
        weakPhonemes: [],
        weakVocabulary: [],
        difficulty,
      });
      expect(result.text).toBe('Test text.');
    }

    expect(mockCreate).toHaveBeenCalledTimes(3);
  });
});
