// Tests for POST /api/drills/[id]/complete — auth, ownership, completion, audio upload, evaluation
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { File as NodeFile } from 'node:buffer';
import { prismaMock } from '@/__mocks__/prisma';

// Polyfill File for Node test environment (not available as a global in Node < 20)
if (typeof globalThis.File === 'undefined') {
  globalThis.File = NodeFile as unknown as typeof File;
}

// --- Mocks ---

vi.mock('@/features/auth/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/db-utils', () => ({ findOrCreateUser: vi.fn() }));
vi.mock('@/lib/ai/whisper', () => ({ transcribeAudio: vi.fn() }));
vi.mock('@/features/training/evaluateDrill', () => ({ evaluateDrill: vi.fn() }));
vi.mock('@/lib/storage/r2', () => ({ uploadAudio: vi.fn(), deleteAudio: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
vi.mock('@/lib/csrf', () => ({
  validateOrigin: vi.fn().mockReturnValue(true),
  csrfForbiddenResponse: vi.fn(),
}));
// Mock validateAudioFile to avoid relying on the global File constructor in Node test env
vi.mock('@/lib/api', () => ({
  validateAudioFile: vi.fn().mockReturnValue({ valid: true }),
  errorResponse: (message: string, code: string, status: number) =>
    Response.json({ error: message, code }, { status }),
  successResponse: <T>(data: T, status = 200) => Response.json(data, { status }),
}));

import { auth } from '@/features/auth/auth';
import { findOrCreateUser } from '@/lib/db-utils';
import { transcribeAudio } from '@/lib/ai/whisper';
import { evaluateDrill } from '@/features/training/evaluateDrill';
import { uploadAudio, deleteAudio } from '@/lib/storage/r2';
import { validateOrigin, csrfForbiddenResponse } from '@/lib/csrf';
import { POST } from './route';

// --- Fixtures ---

const mockSession = {
  user: { externalId: 'ext-1', email: 'user@test.com', name: 'Test User' },
};

const mockUser = { id: 'user-1', externalId: 'ext-1' };

const mockDrill = {
  id: 'drill-1',
  userId: 'user-1',
  drillType: 'rephrase',
  metricKey: 'connectorRepetition',
  prompt: 'Rephrase this',
  sourceExample: 'Test example',
  completedAt: null,
};

const mockEvalResult = {
  feedback: 'Good use of "however" instead of "so".',
  improved: true,
};

const mockUpdatedDrill = {
  id: 'drill-1',
  transcript: 'I was tired, however I went home.',
  feedback: mockEvalResult.feedback,
  improved: true,
  completedAt: new Date('2026-04-03T10:00:00Z'),
};

// --- Helpers ---

function makeFormDataRequest(includeAudio = true): Request {
  const formData = new FormData();
  if (includeAudio) {
    const audioBlob = new Blob(['audio-bytes'], { type: 'audio/webm' });
    formData.append('audio', audioBlob, 'recording.webm');
  }
  return new Request('http://localhost/api/drills/drill-1/complete', {
    method: 'POST',
    body: formData,
  });
}

// --- Tests ---

describe('POST /api/drills/[id]/complete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateOrigin).mockReturnValue(true);
  });

  it('returns 401 when user is not authenticated', async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue(null as never);
    const request = makeFormDataRequest();

    // Act
    const response = await POST(request, { params: Promise.resolve({ id: 'drill-1' }) });

    // Assert
    expect(response.status).toBe(401);
    const body = await response.json() as { error: string; code: string };
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('returns 403 when CSRF origin validation fails', async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(validateOrigin).mockReturnValue(false);
    const forbiddenResp = new Response(null, { status: 403 });
    vi.mocked(csrfForbiddenResponse).mockReturnValue(forbiddenResp);
    const request = makeFormDataRequest();

    // Act
    const response = await POST(request, { params: Promise.resolve({ id: 'drill-1' }) });

    // Assert
    expect(response.status).toBe(403);
    expect(csrfForbiddenResponse).toHaveBeenCalled();
  });

  it('returns 404 when drill is not found', async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(findOrCreateUser).mockResolvedValue(mockUser as never);
    prismaMock.drillAttempt.findUnique.mockResolvedValue(null);
    const request = makeFormDataRequest();

    // Act
    const response = await POST(request, { params: Promise.resolve({ id: 'drill-1' }) });

    // Assert
    expect(response.status).toBe(404);
    const body = await response.json() as { code: string };
    expect(body.code).toBe('NOT_FOUND');
  });

  it('returns 404 when drill belongs to a different user', async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(findOrCreateUser).mockResolvedValue(mockUser as never);
    prismaMock.drillAttempt.findUnique.mockResolvedValue({
      ...mockDrill,
      userId: 'other-user-99',
    } as never);
    const request = makeFormDataRequest();

    // Act
    const response = await POST(request, { params: Promise.resolve({ id: 'drill-1' }) });

    // Assert
    expect(response.status).toBe(404);
    const body = await response.json() as { code: string };
    expect(body.code).toBe('NOT_FOUND');
  });

  it('returns 409 when drill has already been completed', async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(findOrCreateUser).mockResolvedValue(mockUser as never);
    prismaMock.drillAttempt.findUnique.mockResolvedValue({
      ...mockDrill,
      completedAt: new Date('2026-04-02T08:00:00Z'),
    } as never);
    const request = makeFormDataRequest();

    // Act
    const response = await POST(request, { params: Promise.resolve({ id: 'drill-1' }) });

    // Assert
    expect(response.status).toBe(409);
    const body = await response.json() as { code: string };
    expect(body.code).toBe('CONFLICT');
  });

  it('returns 400 when no audio file is provided', async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(findOrCreateUser).mockResolvedValue(mockUser as never);
    prismaMock.drillAttempt.findUnique.mockResolvedValue(mockDrill as never);
    const request = makeFormDataRequest(false);

    // Act
    const response = await POST(request, { params: Promise.resolve({ id: 'drill-1' }) });

    // Assert
    expect(response.status).toBe(400);
    const body = await response.json() as { code: string };
    expect(body.code).toBe('MISSING_AUDIO');
  });

  it('returns 200 with feedback when all inputs are valid', async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(findOrCreateUser).mockResolvedValue(mockUser as never);
    prismaMock.drillAttempt.findUnique.mockResolvedValue(mockDrill as never);
    vi.mocked(uploadAudio).mockResolvedValue('drills/user-1/drill-1/audio.webm');
    vi.mocked(transcribeAudio).mockResolvedValue({
      text: 'I was tired, however I went home.',
      language: 'en',
      segments: [],
    });
    vi.mocked(deleteAudio).mockResolvedValue(undefined);
    vi.mocked(evaluateDrill).mockResolvedValue(mockEvalResult);
    prismaMock.drillAttempt.update.mockResolvedValue(mockUpdatedDrill as never);
    const request = makeFormDataRequest();

    // Act
    const response = await POST(request, { params: Promise.resolve({ id: 'drill-1' }) });

    // Assert
    expect(response.status).toBe(200);
    const body = await response.json() as typeof mockUpdatedDrill;
    expect(body.feedback).toBe(mockEvalResult.feedback);
    expect(body.improved).toBe(true);
    expect(uploadAudio).toHaveBeenCalled();
    expect(transcribeAudio).toHaveBeenCalled();
    expect(deleteAudio).toHaveBeenCalled();
    expect(evaluateDrill).toHaveBeenCalled();
  });
});
