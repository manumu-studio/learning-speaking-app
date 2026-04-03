// Tests for CSRF origin validation — validateOrigin and csrfForbiddenResponse
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/env', () => ({
  env: { APP_URL: 'http://localhost:3000' },
}));

import { validateOrigin, csrfForbiddenResponse } from './csrf';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('validateOrigin', () => {
  it('returns true when Origin header matches app origin', () => {
    const req = new Request('http://localhost:3000/api/test', {
      headers: { origin: 'http://localhost:3000' },
    });
    expect(validateOrigin(req)).toBe(true);
  });

  it('returns false when Origin header does not match app origin', () => {
    const req = new Request('http://localhost:3000/api/test', {
      headers: { origin: 'http://evil.example.com' },
    });
    expect(validateOrigin(req)).toBe(false);
  });

  it('returns true when no Origin header but Referer matches app origin', () => {
    const req = new Request('http://localhost:3000/api/test', {
      headers: { referer: 'http://localhost:3000/some/page' },
    });
    expect(validateOrigin(req)).toBe(true);
  });

  it('returns true when neither Origin nor Referer header is present', () => {
    const req = new Request('http://localhost:3000/api/test');
    expect(validateOrigin(req)).toBe(true);
  });

  it('returns false when Referer origin does not match app origin', () => {
    const req = new Request('http://localhost:3000/api/test', {
      headers: { referer: 'http://attacker.example.com/crafted/page' },
    });
    expect(validateOrigin(req)).toBe(false);
  });
});

describe('csrfForbiddenResponse', () => {
  it('returns a 403 JSON response with CSRF_REJECTED code', async () => {
    const res = csrfForbiddenResponse();
    expect(res.status).toBe(403);
    const body = await res.json() as { error: string; code: string };
    expect(body.code).toBe('CSRF_REJECTED');
  });
});
