// Unit tests for QStash final-attempt detection used by internal process route
import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/logger', () => ({ log: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: {} }));

import { isQstashFinalFailureAttempt } from './pipelineRouteFailure';

describe('isQstashFinalFailureAttempt', () => {
  it('returns true when retry headers are missing', () => {
    const req = new NextRequest('http://localhost/api/internal/process', {
      method: 'POST',
    });
    expect(isQstashFinalFailureAttempt(req)).toBe(true);
  });

  it('returns false when headers parse to NaN (non-numeric)', () => {
    const req = new NextRequest('http://localhost/api/internal/process', {
      method: 'POST',
      headers: {
        'upstash-retried': 'x',
        'upstash-max-retries': 'y',
      },
    });
    expect(isQstashFinalFailureAttempt(req)).toBe(false);
  });

  it('returns true on final retry index', () => {
    const req = new NextRequest('http://localhost/api/internal/process', {
      method: 'POST',
      headers: {
        'upstash-retried': '2',
        'upstash-max-retries': '3',
      },
    });
    expect(isQstashFinalFailureAttempt(req)).toBe(true);
  });

  it('returns false when more retries remain', () => {
    const req = new NextRequest('http://localhost/api/internal/process', {
      method: 'POST',
      headers: {
        'upstash-retried': '0',
        'upstash-max-retries': '3',
      },
    });
    expect(isQstashFinalFailureAttempt(req)).toBe(false);
  });
});
