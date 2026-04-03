// Tests for Anthropic client factory — missing key throws at first use
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('getAnthropicClient', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('throws when ANTHROPIC_API_KEY is not configured', async () => {
    vi.doMock('@/lib/env', () => ({
      env: { ANTHROPIC_API_KEY: undefined },
    }));
    const { getAnthropicClient } = await import('./client');
    expect(() => getAnthropicClient()).toThrow(/ANTHROPIC_API_KEY/);
  });
});
