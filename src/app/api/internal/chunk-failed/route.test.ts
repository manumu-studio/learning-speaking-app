// Tests for QStash chunk failure callback endpoint
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChunkStatus } from '@prisma/client';

const verifyMock = vi.fn().mockResolvedValue(true);

vi.mock('@upstash/qstash', () => ({
  Receiver: vi.fn(() => ({ verify: verifyMock })),
}));

vi.mock('@/lib/env', () => ({
  env: {
    QSTASH_CURRENT_SIGNING_KEY: 'current-key',
    QSTASH_NEXT_SIGNING_KEY: 'next-key',
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: vi.fn().mockReturnThis() },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    sessionChunk: {
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/observability', () => ({
  logPipelineStage: vi.fn(),
  withObservability: (handler: (req: Request, ctx: unknown) => Promise<Response>) => (req: Request) =>
    handler(req, { logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }, requestId: 'test-request-id' }),
  getRequestId: vi.fn().mockReturnValue('test-request-id'),
  withRequestId: vi.fn((_id: string, fn: () => unknown) => fn()),
  currentRequestId: vi.fn(),
  setSentryRequestContext: vi.fn(),
}));

vi.mock('@/features/auth/auth', () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

import { POST } from './route';
import { prisma } from '@/lib/prisma';

function buildFailureCallbackBody(sessionId: string, chunkIndex: number) {
  const sourceBody = Buffer.from(JSON.stringify({ sessionId, chunkIndex })).toString('base64');
  return JSON.stringify({
    status: 500,
    body: Buffer.from('Transcription failed').toString('base64'),
    retried: 3,
    maxRetries: 3,
    sourceBody,
  });
}

describe('POST /api/internal/chunk-failed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyMock.mockResolvedValue(true);
    vi.mocked(prisma.sessionChunk.update).mockResolvedValue({} as never);
  });

  it('marks the chunk as FAILED with the error message', async () => {
    const request = new Request('http://localhost/api/internal/chunk-failed', {
      method: 'POST',
      headers: {
        'upstash-signature': 'valid-signature',
        'Content-Type': 'application/json',
      },
      body: buildFailureCallbackBody('session-1', 2),
    });

    const response = await POST(request as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(prisma.sessionChunk.update).toHaveBeenCalledWith({
      where: { sessionId_chunkIndex: { sessionId: 'session-1', chunkIndex: 2 } },
      data: {
        status: ChunkStatus.FAILED,
        errorMessage: 'Transcription failed',
      },
    });
  });

  it('returns 401 when signature header is missing', async () => {
    const request = new Request('http://localhost/api/internal/chunk-failed', {
      method: 'POST',
      body: buildFailureCallbackBody('session-1', 0),
    });

    const response = await POST(request as never);

    expect(response.status).toBe(401);
    expect(prisma.sessionChunk.update).not.toHaveBeenCalled();
  });

  it('returns 401 when signature is invalid', async () => {
    verifyMock.mockResolvedValue(false);

    const request = new Request('http://localhost/api/internal/chunk-failed', {
      method: 'POST',
      headers: { 'upstash-signature': 'bad-signature' },
      body: buildFailureCallbackBody('session-1', 0),
    });

    const response = await POST(request as never);

    expect(response.status).toBe(401);
    expect(prisma.sessionChunk.update).not.toHaveBeenCalled();
  });
});
