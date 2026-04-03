// Tests for rate limiting middleware — covers pass-through, 429, error fallback, and identifier logic

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import type { Ratelimit } from '@upstash/ratelimit';

// --- Mocks ---

const mockLimit = vi.fn();

vi.mock('@/lib/rateLimit', () => ({
  getRateLimiter: vi.fn(),
}));

import { getRateLimiter } from '@/lib/rateLimit';
import { middleware } from './middleware';

const mockedGetRateLimiter = vi.mocked(getRateLimiter);

// Partial stub that satisfies the `limit` method signature at runtime
const makeRateLimiterStub = (): Ratelimit =>
  ({ limit: mockLimit } as unknown as Ratelimit);

// --- Helpers ---

interface MakeRequestOptions {
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
}

function makeRequest(
  url = 'http://localhost/api/sessions',
  { headers: headerMap, cookies: cookieMap }: MakeRequestOptions = {}
): NextRequest {
  const req =
    headerMap !== undefined
      ? new NextRequest(url, { method: 'POST', headers: headerMap })
      : new NextRequest(url, { method: 'POST' });

  if (cookieMap) {
    for (const [name, value] of Object.entries(cookieMap)) {
      req.cookies.set(name, value);
    }
  }

  return req;
}

// --- Tests ---

describe('middleware — rate limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes through when no rate limiter is configured (getRateLimiter returns null)', async () => {
    mockedGetRateLimiter.mockReturnValue(null);

    const req = makeRequest();
    const res = await middleware(req);

    // NextResponse.next() has no body and status 200
    expect(res.status).toBe(200);
    expect(mockLimit).not.toHaveBeenCalled();
  });

  it('passes through when rate limiter returns success: true', async () => {
    mockLimit.mockResolvedValue({ success: true });
    mockedGetRateLimiter.mockReturnValue(makeRateLimiterStub());

    const req = makeRequest();
    const res = await middleware(req);

    expect(mockLimit).toHaveBeenCalledOnce();
    expect(res.status).toBe(200);
  });

  it('returns 429 when rate limiter returns success: false', async () => {
    mockLimit.mockResolvedValue({ success: false });
    mockedGetRateLimiter.mockReturnValue(makeRateLimiterStub());

    const req = makeRequest();
    const res = await middleware(req);

    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body).toEqual({ error: 'Too many requests', code: 'RATE_LIMITED' });
  });

  it('falls through gracefully when rate limiter throws (Redis down)', async () => {
    mockLimit.mockRejectedValue(new Error('Redis connection refused'));
    mockedGetRateLimiter.mockReturnValue(makeRateLimiterStub());

    const req = makeRequest();
    const res = await middleware(req);

    // Should not throw; should pass through with 200
    expect(res.status).toBe(200);
  });

  it('uses session token as identifier when authjs.session-token cookie is present', async () => {
    mockLimit.mockResolvedValue({ success: true });
    mockedGetRateLimiter.mockReturnValue(makeRateLimiterStub());

    const token = 'abcdefghijklmnop1234567890qrstuvwxyz'; // > 16 chars
    const req = makeRequest('http://localhost/api/sessions', {
      cookies: { 'authjs.session-token': token },
    });

    await middleware(req);

    const expectedIdentifier = `user:${token.slice(-16)}`;
    expect(mockLimit).toHaveBeenCalledWith(expectedIdentifier);
  });

  it('uses __Secure-authjs.session-token cookie as identifier when present', async () => {
    mockLimit.mockResolvedValue({ success: true });
    mockedGetRateLimiter.mockReturnValue(makeRateLimiterStub());

    const token = 'secure-token-abcdefghijklmnopqrstuvwxyz';
    const req = makeRequest('http://localhost/api/sessions', {
      cookies: { '__Secure-authjs.session-token': token },
    });

    await middleware(req);

    const expectedIdentifier = `user:${token.slice(-16)}`;
    expect(mockLimit).toHaveBeenCalledWith(expectedIdentifier);
  });

  it('falls back to IP from x-forwarded-for header when no session cookie is present', async () => {
    mockLimit.mockResolvedValue({ success: true });
    mockedGetRateLimiter.mockReturnValue(makeRateLimiterStub());

    const req = makeRequest('http://localhost/api/sessions', {
      headers: { 'x-forwarded-for': '203.0.113.42, 10.0.0.1' },
    });

    await middleware(req);

    // Should use the first IP in the comma-separated list
    expect(mockLimit).toHaveBeenCalledWith('ip:203.0.113.42');
  });

  it('falls back to ip:unknown when no session cookie and no x-forwarded-for header', async () => {
    mockLimit.mockResolvedValue({ success: true });
    mockedGetRateLimiter.mockReturnValue(makeRateLimiterStub());

    const req = makeRequest();
    await middleware(req);

    expect(mockLimit).toHaveBeenCalledWith('ip:unknown');
  });
});
