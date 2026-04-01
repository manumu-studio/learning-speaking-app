// Tests for middleware — rate limiting logic and identifier derivation
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/server before importing middleware
const mockNextFn = vi.fn();
const mockJsonFn = vi.fn();

vi.mock('next/server', () => {
  return {
    NextResponse: {
      next: () => mockNextFn(),
      json: (body: unknown, init?: { status?: number }) => mockJsonFn(body, init),
    },
  };
});

// Mock rateLimit module
const mockLimit = vi.fn();
const mockGetRateLimiter = vi.fn();

vi.mock('@/lib/rateLimit', () => ({
  getRateLimiter: () => mockGetRateLimiter(),
}));

// Helper: build a minimal NextRequest-shaped object
function makeRequest({
  cookies = {} as Record<string, string>,
  headers = {} as Record<string, string>,
}: {
  cookies?: Record<string, string>;
  headers?: Record<string, string>;
}) {
  return {
    cookies: {
      get: (name: string) => {
        const val = cookies[name];
        return val !== undefined ? { value: val } : undefined;
      },
    },
    headers: {
      get: (name: string) => headers[name] ?? null,
    },
  } as unknown as import('next/server').NextRequest;
}

describe('middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNextFn.mockReturnValue({ type: 'next' });
    mockJsonFn.mockImplementation((body: unknown, init?: { status?: number }) => ({
      type: 'json',
      body,
      status: init?.status,
    }));
  });

  it('passes through immediately when no rate limiter is configured', async () => {
    mockGetRateLimiter.mockReturnValue(null);
    const { middleware } = await import('./middleware');

    const req = makeRequest({});
    await middleware(req);

    expect(mockNextFn).toHaveBeenCalledOnce();
    expect(mockJsonFn).not.toHaveBeenCalled();
  });

  it('passes through when rate limiter allows the request', async () => {
    mockLimit.mockResolvedValue({ success: true });
    mockGetRateLimiter.mockReturnValue({ limit: mockLimit });
    const { middleware } = await import('./middleware');

    const req = makeRequest({ headers: { 'x-forwarded-for': '1.2.3.4' } });
    await middleware(req);

    expect(mockNextFn).toHaveBeenCalledOnce();
    expect(mockJsonFn).not.toHaveBeenCalled();
  });

  it('returns 429 JSON response when rate limit is exceeded', async () => {
    mockLimit.mockResolvedValue({ success: false });
    mockGetRateLimiter.mockReturnValue({ limit: mockLimit });
    const { middleware } = await import('./middleware');

    const req = makeRequest({ headers: { 'x-forwarded-for': '1.2.3.4' } });
    await middleware(req);

    expect(mockJsonFn).toHaveBeenCalledWith(
      { error: 'Too many requests', code: 'RATE_LIMITED' },
      { status: 429 }
    );
    expect(mockNextFn).not.toHaveBeenCalled();
  });

  it('uses user identifier derived from authjs.session-token cookie (last 16 chars)', async () => {
    mockLimit.mockResolvedValue({ success: true });
    mockGetRateLimiter.mockReturnValue({ limit: mockLimit });
    const { middleware } = await import('./middleware');

    const token = 'abcdefghij1234567890';
    const req = makeRequest({ cookies: { 'authjs.session-token': token } });
    await middleware(req);

    expect(mockLimit).toHaveBeenCalledWith(`user:${token.slice(-16)}`);
  });

  it('uses user identifier derived from __Secure-authjs.session-token cookie', async () => {
    mockLimit.mockResolvedValue({ success: true });
    mockGetRateLimiter.mockReturnValue({ limit: mockLimit });
    const { middleware } = await import('./middleware');

    const token = 'securetokenabcde1234567890';
    const req = makeRequest({ cookies: { '__Secure-authjs.session-token': token } });
    await middleware(req);

    expect(mockLimit).toHaveBeenCalledWith(`user:${token.slice(-16)}`);
  });

  it('prefers authjs.session-token over __Secure-authjs.session-token', async () => {
    mockLimit.mockResolvedValue({ success: true });
    mockGetRateLimiter.mockReturnValue({ limit: mockLimit });
    const { middleware } = await import('./middleware');

    const primaryToken = 'primary-token-xyz1234567890';
    const secureToken = 'secure-token-xyz1234567890';
    const req = makeRequest({
      cookies: {
        'authjs.session-token': primaryToken,
        '__Secure-authjs.session-token': secureToken,
      },
    });
    await middleware(req);

    expect(mockLimit).toHaveBeenCalledWith(`user:${primaryToken.slice(-16)}`);
  });

  it('uses IP identifier from x-forwarded-for when no cookie is present', async () => {
    mockLimit.mockResolvedValue({ success: true });
    mockGetRateLimiter.mockReturnValue({ limit: mockLimit });
    const { middleware } = await import('./middleware');

    const req = makeRequest({ headers: { 'x-forwarded-for': '10.0.0.1' } });
    await middleware(req);

    expect(mockLimit).toHaveBeenCalledWith('ip:10.0.0.1');
  });

  it('uses first IP from comma-separated x-forwarded-for', async () => {
    mockLimit.mockResolvedValue({ success: true });
    mockGetRateLimiter.mockReturnValue({ limit: mockLimit });
    const { middleware } = await import('./middleware');

    const req = makeRequest({ headers: { 'x-forwarded-for': '10.0.0.1, 10.0.0.2, 10.0.0.3' } });
    await middleware(req);

    expect(mockLimit).toHaveBeenCalledWith('ip:10.0.0.1');
  });

  it('falls back to ip:unknown when no cookie and no x-forwarded-for header', async () => {
    mockLimit.mockResolvedValue({ success: true });
    mockGetRateLimiter.mockReturnValue({ limit: mockLimit });
    const { middleware } = await import('./middleware');

    const req = makeRequest({});
    await middleware(req);

    expect(mockLimit).toHaveBeenCalledWith('ip:unknown');
  });
});

describe('middleware config', () => {
  it('exports a matcher that covers /api/* routes', async () => {
    const { config } = await import('./middleware');
    expect(config.matcher).toContain('/api/((?!auth/).*)');
  });

  it('does not match /api/auth/* routes (matcher excludes auth paths)', () => {
    const pattern = '/api/((?!auth/).*)';
    const re = new RegExp(pattern);
    expect(re.test('/api/auth/signin')).toBe(false);
    expect(re.test('/api/auth/signout')).toBe(false);
  });

  it('matches non-auth API routes', () => {
    const pattern = '/api/((?!auth/).*)';
    const re = new RegExp(pattern);
    expect(re.test('/api/sessions')).toBe(true);
    expect(re.test('/api/drills')).toBe(true);
    expect(re.test('/api/drills/123/complete')).toBe(true);
  });
});