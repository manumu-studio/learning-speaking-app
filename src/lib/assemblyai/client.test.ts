// Tests for the lazy-singleton AssemblyAI client.
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mutable env stub the client reads through — toggled per test.
const mockEnv: { ASSEMBLYAI_API_KEY: string | undefined } = { ASSEMBLYAI_API_KEY: 'test-key' };
vi.mock('@/lib/env', () => ({ env: mockEnv }));
vi.mock('assemblyai', () => ({
  AssemblyAI: vi.fn().mockImplementation((opts: unknown) => ({ opts })),
}));

beforeEach(() => {
  vi.resetModules(); // reset the module-scope singleton between tests
  vi.clearAllMocks();
});

describe('getAssemblyAIClient', () => {
  it('throws a descriptive error when ASSEMBLYAI_API_KEY is missing', async () => {
    mockEnv.ASSEMBLYAI_API_KEY = undefined;
    const { getAssemblyAIClient } = await import('./client');
    expect(() => getAssemblyAIClient()).toThrow(/ASSEMBLYAI_API_KEY/);
  });

  it('constructs the client with the api key and memoizes the singleton', async () => {
    mockEnv.ASSEMBLYAI_API_KEY = 'test-key';
    const { AssemblyAI } = await import('assemblyai');
    const { getAssemblyAIClient } = await import('./client');

    const first = getAssemblyAIClient();
    const second = getAssemblyAIClient();

    expect(first).toBe(second); // same instance reused
    expect(AssemblyAI).toHaveBeenCalledTimes(1); // constructed only once
    expect(AssemblyAI).toHaveBeenCalledWith({ apiKey: 'test-key' });
  });
});
