// Tests for health check endpoint
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

import { GET } from './route';
import { prisma } from '@/lib/prisma';

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with status ok when database is healthy', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ '?column?': 1 }]);

    const response = await GET();
    const body = (await response.json()) as {
      status: string;
      checks: { database: string };
    };

    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.checks.database).toBe('ok');
  });

  it('returns 503 with status error when database is down', async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('Connection refused'));

    const response = await GET();
    const body = (await response.json()) as {
      status: string;
      checks: { database: string };
    };

    expect(response.status).toBe(503);
    expect(body.status).toBe('error');
    expect(body.checks.database).toBe('error');
  });

  it('response contains all required fields with correct types', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ '?column?': 1 }]);

    const response = await GET();
    const body = (await response.json()) as {
      status: string;
      version: string;
      uptime: number;
      timestamp: string;
      environment: string;
      checks: { database: string };
    };

    expect(body.status).toBeDefined();
    expect(body.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(typeof body.uptime).toBe('number');
    expect(body.uptime).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(body.uptime)).toBe(true);
    expect(() => new Date(body.timestamp)).not.toThrow();
    expect(body.environment).toBeDefined();
    expect(body.checks).toBeDefined();
    expect(body.checks.database).toBeDefined();
  });
});
