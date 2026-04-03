// Tests for QStash enqueue helper — dev mode triggers local pipeline fetch
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('enqueueProcessing', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('posts to dev process route when NODE_ENV is development', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    vi.doMock('@/lib/env', () => ({
      env: {
        NODE_ENV: 'development',
        APP_URL: 'http://localhost:3000',
        QSTASH_TOKEN: undefined,
      },
    }));
    vi.doMock('@/lib/logger', () => ({
      log: vi.fn(),
    }));

    const { enqueueProcessing } = await import('./qstash');
    await enqueueProcessing('session-xyz');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/dev/process',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ sessionId: 'session-xyz' }),
      }),
    );
  });
});
