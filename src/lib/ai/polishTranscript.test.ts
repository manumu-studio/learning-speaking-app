// Tests for transcript polishing — punctuation, capitalization, paragraph breaks

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/env', () => ({
  env: { NODE_ENV: 'test', ANTHROPIC_API_KEY: 'test-key' },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const mockCreate = vi.hoisted(() => vi.fn());

vi.mock('@/lib/ai/client', () => ({
  getAnthropicClient: () => ({
    messages: { create: mockCreate },
  }),
}));

import { polishTranscript } from './polishTranscript';

describe('polishTranscript', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty string for empty input', async () => {
    const result = await polishTranscript('');
    expect(result).toBe('');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns polished text from Claude', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Hello, world. This is a test.' }],
    });

    const result = await polishTranscript('hello world this is a test');
    expect(result).toBe('Hello, world. This is a test.');
  });

  it('falls back to raw text on API error', async () => {
    mockCreate.mockRejectedValue(new Error('API timeout'));

    const result = await polishTranscript('hello world');
    expect(result).toBe('hello world');
  });

  it('falls back to raw text on non-text response', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'tool_use', id: 'x' }],
    });

    const result = await polishTranscript('hello world');
    expect(result).toBe('hello world');
  });

  it('falls back to raw text on empty response', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: '  ' }],
    });

    const result = await polishTranscript('hello world');
    expect(result).toBe('hello world');
  });
});
