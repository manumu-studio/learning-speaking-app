// Tests for POST /api/daily/language-bank/feedback — auth guard, validation, and action handling
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '@/__mocks__/prisma';

// --- Module mocks ---
vi.mock('@/features/auth/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/observability', () => ({
  withObservability: (handler: (req: Request) => Promise<Response>) => handler,
}));
vi.mock('@/app/api/users/me/daily-summaries/route.helpers', () => ({
  resolveUser: vi.fn(),
}));

import { POST } from './route';
import { auth } from '@/features/auth/auth';
import { resolveUser } from '@/app/api/users/me/daily-summaries/route.helpers';

// --- Fixtures ---
const mockSession = { user: { externalId: 'ext-1' } };
const mockUser = { id: 'user-1' };
const mockItem = { id: 'item-1', userId: 'user-1', text: 'nevertheless', usageCount: 0, isActiveTarget: true };
const mockUpdatedItem = { ...mockItem, usageCount: 1 };

function makePostRequest(body: unknown): Request {
  return new Request('http://localhost/api/daily/language-bank/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// --- Tests ---
describe('POST /api/daily/language-bank/feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const response = await POST(makePostRequest({ itemId: 'item-1', action: 'used' }));

    expect(response.status).toBe(401);
    const body = await response.json() as { error: string };
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 400 on invalid action', async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);

    const response = await POST(makePostRequest({ itemId: 'item-1', action: 'invalid_action' }));

    expect(response.status).toBe(400);
    const body = await response.json() as { error: string };
    expect(body.error).toContain('itemId and action are required');
  });

  it('returns 400 when body is not valid JSON', async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);

    const badRequest = new Request('http://localhost/api/daily/language-bank/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json{{{',
    });

    const response = await POST(badRequest);

    expect(response.status).toBe(400);
  });

  it('returns 200 on successful "used" action', async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(resolveUser).mockResolvedValue(mockUser as never);
    prismaMock.languageBankItem.findFirst.mockResolvedValue(mockItem as never);
    prismaMock.languageBankItem.update.mockResolvedValue(mockUpdatedItem as never);

    const response = await POST(makePostRequest({ itemId: 'item-1', action: 'used' }));

    expect(response.status).toBe(200);
    const body = await response.json() as typeof mockUpdatedItem;
    expect(body.usageCount).toBe(1);
    expect(prismaMock.languageBankItem.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'item-1' } }),
    );
  });

  it('returns 404 when item is not found', async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(resolveUser).mockResolvedValue(mockUser as never);
    prismaMock.languageBankItem.findFirst.mockResolvedValue(null as never);

    const response = await POST(makePostRequest({ itemId: 'no-such-item', action: 'used' }));

    expect(response.status).toBe(404);
  });
});
