// Tests for GET /api/daily/language-bank — auth guard and item retrieval
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

import { GET } from './route';
import { auth } from '@/features/auth/auth';
import { resolveUser } from '@/app/api/users/me/daily-summaries/route.helpers';

// --- Fixtures ---
const mockSession = { user: { externalId: 'ext-1' } };
const mockUser = { id: 'user-1' };

const mockItems = [
  { id: 'item-1', userId: 'user-1', text: 'nevertheless', masteryState: 'new', isActiveTarget: true },
  { id: 'item-2', userId: 'user-1', text: 'consequently', masteryState: 'practiced', isActiveTarget: false },
];

function makeGetRequest(): Request {
  return new Request('http://localhost/api/daily/language-bank');
}

// --- Tests ---
describe('GET /api/daily/language-bank', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const response = await GET(makeGetRequest());

    expect(response.status).toBe(401);
    const body = await response.json() as { error: string };
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 200 with items and activeTargets for authenticated user', async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(resolveUser).mockResolvedValue(mockUser as never);
    prismaMock.languageBankItem.findMany.mockResolvedValue(mockItems as never);

    const response = await GET(makeGetRequest());

    expect(response.status).toBe(200);
    const body = await response.json() as { items: typeof mockItems; activeTargets: typeof mockItems };
    expect(body.items).toHaveLength(2);
    expect(body.activeTargets).toHaveLength(1);
    expect(body.activeTargets[0]?.id).toBe('item-1');
  });

  it('returns 404 when user is not found in DB', async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(resolveUser).mockResolvedValue(null as never);

    const response = await GET(makeGetRequest());

    expect(response.status).toBe(404);
    const body = await response.json() as { error: string };
    expect(body.error).toBe('User not found');
  });
});
