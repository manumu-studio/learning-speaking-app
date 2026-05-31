// Unit tests for withObservability API route wrapper
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  setUser: vi.fn(),
  setTag: vi.fn(),
  setContext: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    child: vi.fn().mockReturnValue({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

vi.mock('@/features/auth/auth', () => ({
  auth: vi.fn().mockResolvedValue({ user: { externalId: 'user-123' } }),
}));

import * as Sentry from '@sentry/nextjs';
import { logger } from '@/lib/logger';
import { withObservability } from '../withObservability';

describe('withObservability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the handler response on success', async () => {
    const handler = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    const wrapped = withObservability(handler, { route: 'test/route' });
    const req = new Request('http://localhost/api/test');
    const response = await wrapped(req);

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('injects requestId and logger into handler context', async () => {
    const handler = vi.fn().mockResolvedValue(new Response('ok'));

    const wrapped = withObservability(handler, { route: 'test/route' });
    const req = new Request('http://localhost/api/test', {
      headers: { 'x-request-id': 'req-abc' },
    });
    await wrapped(req);

    const ctx = handler.mock.calls[0]?.[1] as { requestId: string; logger: unknown };
    expect(ctx.requestId).toBe('req-abc');
    expect(ctx.logger).toBeDefined();
  });

  it('creates a child logger with requestId and route', async () => {
    const handler = vi.fn().mockResolvedValue(new Response('ok'));

    const wrapped = withObservability(handler, { route: 'my/route' });
    await wrapped(new Request('http://localhost/api/test'));

    expect(logger.child).toHaveBeenCalledWith(
      expect.objectContaining({ route: 'my/route', requestId: expect.any(String) }),
    );
  });

  it('returns 500 JSON and captures exception on unhandled error', async () => {
    const testError = new Error('Handler exploded');
    const handler = vi.fn().mockRejectedValue(testError);

    const wrapped = withObservability(handler, { route: 'test/error' });
    const response = await wrapped(new Request('http://localhost/api/test'));

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: 'Internal server error' });
    expect(Sentry.captureException).toHaveBeenCalledWith(testError);
  });

  it('logs request start and completion with duration', async () => {
    const handler = vi.fn().mockResolvedValue(new Response('ok'));
    const childLogger = { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() };
    vi.mocked(logger.child).mockReturnValue(childLogger as never);

    const wrapped = withObservability(handler, { route: 'test/timing' });
    await wrapped(new Request('http://localhost/api/test'));

    expect(childLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'GET' }),
      'Request started',
    );
    expect(childLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({ durationMs: expect.any(Number), status: 200 }),
      'Request completed',
    );
  });
});
