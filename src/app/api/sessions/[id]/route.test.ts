// Tests for GET /api/sessions/[id] — session detail fetch with Cache-Control
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '@/__mocks__/prisma';
import { SessionStatus } from '@prisma/client';

vi.mock('@/features/auth/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/storage/r2', () => ({ deleteAudio: vi.fn(), uploadAudio: vi.fn(), generateAudioKey: vi.fn() }));
vi.mock('@/lib/csrf', () => ({ validateOrigin: vi.fn().mockReturnValue(true), csrfForbiddenResponse: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

import { auth } from '@/features/auth/auth';
import { validateOrigin, csrfForbiddenResponse } from '@/lib/csrf';
import { deleteAudio } from '@/lib/storage/r2';
import { logger } from '@/lib/logger';
import { GET, DELETE } from './route';

const mockAuthSession = { user: { externalId: 'ext-1' } };
const mockUser = { id: 'user-1', externalId: 'ext-1' };

const mockSpeakingSession = {
  id: 'session-1',
  userId: 'user-1',
  status: SessionStatus.DONE,
  createdAt: new Date('2026-01-15T10:00:00Z'),
  transcript: null,
  insights: [],
  metrics: [],
  pronunciationReport: null,
  chunks: [],
};

describe('GET /api/sessions/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET returns Cache-Control header', async () => {
    vi.mocked(auth).mockResolvedValueOnce(mockAuthSession as never);
    prismaMock.user.findUnique.mockResolvedValueOnce(mockUser as never);
    prismaMock.speakingSession.findFirst.mockResolvedValueOnce(mockSpeakingSession as never);
    prismaMock.speakingSession.count.mockResolvedValueOnce(1);

    const response = await GET(new Request('http://localhost/api/sessions/session-1'), {
      params: Promise.resolve({ id: 'session-1' }),
    });

    expect(response.headers.get('Cache-Control')).toBe(
      'private, max-age=60, stale-while-revalidate=120',
    );
  });
});

describe('DELETE /api/sessions/[id]', () => {
  const deleteRequest = new Request('http://localhost/api/sessions/session-1', {
    method: 'DELETE',
  });
  const deleteParams = { params: Promise.resolve({ id: 'session-1' }) };

  const mockSessionWithAudio = {
    id: 'session-1',
    userId: 'user-1',
    status: SessionStatus.DONE,
    audioUrl: 'audio/session-1.webm',
    audioDeletedAt: null,
    createdAt: new Date('2026-01-15T10:00:00Z'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never);

    const response = await DELETE(deleteRequest, deleteParams);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('returns CSRF forbidden when origin validation fails', async () => {
    vi.mocked(auth).mockResolvedValueOnce(mockAuthSession as never);
    vi.mocked(validateOrigin).mockReturnValueOnce(false);
    vi.mocked(csrfForbiddenResponse).mockReturnValueOnce(
      new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
    );

    const response = await DELETE(deleteRequest, deleteParams);

    expect(response.status).toBe(403);
    expect(csrfForbiddenResponse).toHaveBeenCalled();
  });

  it('returns 404 when session not found or not owned by user', async () => {
    vi.mocked(auth).mockResolvedValueOnce(mockAuthSession as never);
    vi.mocked(validateOrigin).mockReturnValueOnce(true);
    prismaMock.user.findUnique.mockResolvedValueOnce(mockUser as never);
    prismaMock.speakingSession.findFirst.mockResolvedValueOnce(null as never);

    const response = await DELETE(deleteRequest, deleteParams);

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.code).toBe('SESSION_NOT_FOUND');
  });

  it('deletes R2 audio for session and chunks (best-effort)', async () => {
    vi.mocked(auth).mockResolvedValueOnce(mockAuthSession as never);
    vi.mocked(validateOrigin).mockReturnValueOnce(true);
    prismaMock.user.findUnique.mockResolvedValueOnce(mockUser as never);
    prismaMock.speakingSession.findFirst.mockResolvedValueOnce(mockSessionWithAudio as never);
    prismaMock.sessionChunk.findMany.mockResolvedValueOnce([
      { audioUrl: 'audio/chunk-1.webm' },
      { audioUrl: 'audio/chunk-2.webm' },
    ] as never);
    prismaMock.speakingSession.delete.mockResolvedValueOnce(mockSessionWithAudio as never);

    await DELETE(deleteRequest, deleteParams);

    expect(deleteAudio).toHaveBeenCalledTimes(3);
    expect(deleteAudio).toHaveBeenCalledWith('audio/session-1.webm');
    expect(deleteAudio).toHaveBeenCalledWith('audio/chunk-1.webm');
    expect(deleteAudio).toHaveBeenCalledWith('audio/chunk-2.webm');
  });

  it('skips session audio if audioDeletedAt is already set', async () => {
    vi.mocked(auth).mockResolvedValueOnce(mockAuthSession as never);
    vi.mocked(validateOrigin).mockReturnValueOnce(true);
    prismaMock.user.findUnique.mockResolvedValueOnce(mockUser as never);
    prismaMock.speakingSession.findFirst.mockResolvedValueOnce({
      ...mockSessionWithAudio,
      audioDeletedAt: new Date(),
    } as never);
    prismaMock.sessionChunk.findMany.mockResolvedValueOnce([] as never);
    prismaMock.speakingSession.delete.mockResolvedValueOnce(mockSessionWithAudio as never);

    await DELETE(deleteRequest, deleteParams);

    expect(deleteAudio).not.toHaveBeenCalled();
  });

  it('calls prisma.speakingSession.delete with correct ID', async () => {
    vi.mocked(auth).mockResolvedValueOnce(mockAuthSession as never);
    vi.mocked(validateOrigin).mockReturnValueOnce(true);
    prismaMock.user.findUnique.mockResolvedValueOnce(mockUser as never);
    prismaMock.speakingSession.findFirst.mockResolvedValueOnce(mockSessionWithAudio as never);
    prismaMock.sessionChunk.findMany.mockResolvedValueOnce([] as never);
    prismaMock.speakingSession.delete.mockResolvedValueOnce(mockSessionWithAudio as never);

    await DELETE(deleteRequest, deleteParams);

    expect(prismaMock.speakingSession.delete).toHaveBeenCalledWith({
      where: { id: 'session-1' },
    });
  });

  it('returns 204 with null body on success', async () => {
    vi.mocked(auth).mockResolvedValueOnce(mockAuthSession as never);
    vi.mocked(validateOrigin).mockReturnValueOnce(true);
    prismaMock.user.findUnique.mockResolvedValueOnce(mockUser as never);
    prismaMock.speakingSession.findFirst.mockResolvedValueOnce(mockSessionWithAudio as never);
    prismaMock.sessionChunk.findMany.mockResolvedValueOnce([] as never);
    prismaMock.speakingSession.delete.mockResolvedValueOnce(mockSessionWithAudio as never);

    const response = await DELETE(deleteRequest, deleteParams);

    expect(response.status).toBe(204);
    expect(response.body).toBeNull();
  });

  it('logs warning (not error) if R2 deletion fails', async () => {
    vi.mocked(auth).mockResolvedValueOnce(mockAuthSession as never);
    vi.mocked(validateOrigin).mockReturnValueOnce(true);
    prismaMock.user.findUnique.mockResolvedValueOnce(mockUser as never);
    prismaMock.speakingSession.findFirst.mockResolvedValueOnce(mockSessionWithAudio as never);
    prismaMock.sessionChunk.findMany.mockResolvedValueOnce([] as never);
    prismaMock.speakingSession.delete.mockResolvedValueOnce(mockSessionWithAudio as never);
    vi.mocked(deleteAudio).mockRejectedValueOnce(new Error('R2 unavailable'));

    const response = await DELETE(deleteRequest, deleteParams);

    expect(response.status).toBe(204);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      'Failed to delete audio from R2',
    );
    expect(logger.error).not.toHaveBeenCalled();
  });
});
