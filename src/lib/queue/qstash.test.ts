// Tests for QStash enqueue helpers — covers prod publish, dev fetch, and singleton reuse
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Shared mocks ──────────────────────────────────────────────────────────────

const mockPublishJSON = vi.fn().mockResolvedValue({ messageId: 'msg-1' });
const MockClient = vi.fn(() => ({ publishJSON: mockPublishJSON }));

vi.mock('@upstash/qstash', () => ({
  Client: MockClient,
}));

vi.mock('@/lib/logger', () => ({
  log: vi.fn(),
}));

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Re-import the module fresh so the lazy singleton is reset between test groups. */
async function importWithEnv(overrides: {
  NODE_ENV: 'development' | 'production' | 'test';
  QSTASH_TOKEN?: string;
  APP_URL?: string;
}) {
  vi.resetModules();
  vi.doMock('@/lib/env', () => ({
    env: {
      QSTASH_TOKEN: overrides.QSTASH_TOKEN ?? 'test-token',
      APP_URL: overrides.APP_URL ?? 'http://localhost:3000',
      NODE_ENV: overrides.NODE_ENV,
    },
  }));
  vi.doMock('@/lib/logger', () => ({ log: vi.fn() }));
  vi.doMock('@upstash/qstash', () => ({ Client: MockClient }));

  return import('./qstash');
}

// ─── enqueueProcessing ─────────────────────────────────────────────────────────

describe('enqueueProcessing', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    mockPublishJSON.mockClear();
    MockClient.mockClear();
  });

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('posts to dev process route when NODE_ENV is development', async () => {
    const { enqueueProcessing } = await importWithEnv({ NODE_ENV: 'development' });
    await enqueueProcessing('session-xyz');

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/dev/process',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'session-xyz' }),
      }),
    );
    expect(mockPublishJSON).not.toHaveBeenCalled();
  });

  it('publishes to QStash when NODE_ENV is production', async () => {
    const { enqueueProcessing } = await importWithEnv({ NODE_ENV: 'production' });
    await enqueueProcessing('session-prod');

    expect(mockPublishJSON).toHaveBeenCalledOnce();
    expect(mockPublishJSON).toHaveBeenCalledWith({
      url: 'http://localhost:3000/api/internal/process',
      body: { sessionId: 'session-prod' },
      retries: 3,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('initialises the QStash Client with the token', async () => {
    const { enqueueProcessing } = await importWithEnv({
      NODE_ENV: 'production',
      QSTASH_TOKEN: 'my-secret-token',
    });
    await enqueueProcessing('session-tok');

    expect(MockClient).toHaveBeenCalledWith({ token: 'my-secret-token' });
  });

  it('throws when QSTASH_TOKEN is missing in production', async () => {
    vi.resetModules();
    vi.doMock('@/lib/env', () => ({
      env: {
        QSTASH_TOKEN: undefined,
        APP_URL: 'http://localhost:3000',
        NODE_ENV: 'production',
      },
    }));
    vi.doMock('@/lib/logger', () => ({ log: vi.fn() }));
    vi.doMock('@upstash/qstash', () => ({ Client: MockClient }));

    const { enqueueProcessing } = await import('./qstash');
    await expect(enqueueProcessing('session-fail')).rejects.toThrow('QSTASH_TOKEN');
  });

  it('reuses the singleton client on a second call', async () => {
    const { enqueueProcessing } = await importWithEnv({ NODE_ENV: 'production' });
    await enqueueProcessing('session-a');
    await enqueueProcessing('session-b');

    // Client constructor called exactly once despite two publishes
    expect(MockClient).toHaveBeenCalledOnce();
    expect(mockPublishJSON).toHaveBeenCalledTimes(2);
  });

  it('swallows fetch errors in dev mode without throwing', async () => {
    fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
    vi.stubGlobal('fetch', fetchMock);
    const { enqueueProcessing } = await importWithEnv({ NODE_ENV: 'development' });

    await expect(enqueueProcessing('session-err')).resolves.toBeUndefined();
  });
});

// ─── enqueueChunkProcessing ────────────────────────────────────────────────────

describe('enqueueChunkProcessing', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    mockPublishJSON.mockClear();
    MockClient.mockClear();
  });

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('posts to dev process-chunk route in development', async () => {
    const { enqueueChunkProcessing } = await importWithEnv({ NODE_ENV: 'development' });
    await enqueueChunkProcessing('session-c1', 2);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/dev/process-chunk',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ sessionId: 'session-c1', chunkIndex: 2 }),
      }),
    );
    expect(mockPublishJSON).not.toHaveBeenCalled();
  });

  it('publishes to QStash process-chunk endpoint in production', async () => {
    const { enqueueChunkProcessing } = await importWithEnv({ NODE_ENV: 'production' });
    await enqueueChunkProcessing('session-c2', 5);

    expect(mockPublishJSON).toHaveBeenCalledWith({
      url: 'http://localhost:3000/api/internal/process-chunk',
      body: { sessionId: 'session-c2', chunkIndex: 5 },
      retries: 3,
    });
  });

  it('sends chunkIndex 0 correctly', async () => {
    const { enqueueChunkProcessing } = await importWithEnv({ NODE_ENV: 'production' });
    await enqueueChunkProcessing('session-c3', 0);

    expect(mockPublishJSON).toHaveBeenCalledWith(
      expect.objectContaining({ body: { sessionId: 'session-c3', chunkIndex: 0 } }),
    );
  });

  it('swallows fetch errors in dev mode without throwing', async () => {
    fetchMock = vi.fn().mockRejectedValue(new Error('timeout'));
    vi.stubGlobal('fetch', fetchMock);
    const { enqueueChunkProcessing } = await importWithEnv({ NODE_ENV: 'development' });

    await expect(enqueueChunkProcessing('session-c4', 1)).resolves.toBeUndefined();
  });
});

// ─── enqueueFinalProcessing ────────────────────────────────────────────────────

describe('enqueueFinalProcessing', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    mockPublishJSON.mockClear();
    MockClient.mockClear();
  });

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('posts to dev process-final route in development', async () => {
    const { enqueueFinalProcessing } = await importWithEnv({ NODE_ENV: 'development' });
    await enqueueFinalProcessing('session-f1');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/dev/process-final',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ sessionId: 'session-f1' }),
      }),
    );
    expect(mockPublishJSON).not.toHaveBeenCalled();
  });

  it('publishes to QStash process-final endpoint in production', async () => {
    const { enqueueFinalProcessing } = await importWithEnv({ NODE_ENV: 'production' });
    await enqueueFinalProcessing('session-f2');

    expect(mockPublishJSON).toHaveBeenCalledWith({
      url: 'http://localhost:3000/api/internal/process-final',
      body: { sessionId: 'session-f2' },
      retries: 3,
    });
  });

  it('uses the APP_URL from env for the QStash target', async () => {
    const { enqueueFinalProcessing } = await importWithEnv({
      NODE_ENV: 'production',
      APP_URL: 'https://myapp.vercel.app',
    });
    await enqueueFinalProcessing('session-f3');

    expect(mockPublishJSON).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://myapp.vercel.app/api/internal/process-final',
      }),
    );
  });

  it('swallows fetch errors in dev mode without throwing', async () => {
    fetchMock = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    vi.stubGlobal('fetch', fetchMock);
    const { enqueueFinalProcessing } = await importWithEnv({ NODE_ENV: 'development' });

    await expect(enqueueFinalProcessing('session-f4')).resolves.toBeUndefined();
  });

  it('reuses singleton across enqueueChunkProcessing and enqueueFinalProcessing calls', async () => {
    const { enqueueChunkProcessing, enqueueFinalProcessing } = await importWithEnv({
      NODE_ENV: 'production',
    });
    await enqueueChunkProcessing('session-shared', 0);
    await enqueueFinalProcessing('session-shared');

    expect(MockClient).toHaveBeenCalledOnce();
    expect(mockPublishJSON).toHaveBeenCalledTimes(2);
  });
});
