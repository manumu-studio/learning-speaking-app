// Unit tests for POST /api/sessions — session creation with auth, CSRF, consent, and upload guards
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '@/__mocks__/prisma';
import { SessionStatus } from '@prisma/client';

// Polyfill File for Node environment — route logic uses `instanceof File`
import { File as NodeFile } from 'buffer';
if (typeof File === 'undefined') {
  (globalThis as unknown as Record<string, unknown>).File = NodeFile;
}

vi.mock('@/features/auth/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/db-utils', () => ({ findOrCreateUser: vi.fn(), hasConsent: vi.fn() }));
vi.mock('@/lib/storage/r2', () => ({ uploadAudio: vi.fn(), generateAudioKey: vi.fn() }));
vi.mock('@/lib/queue/qstash', () => ({ enqueueProcessing: vi.fn() }));
vi.mock('@/lib/logger', () => ({ log: vi.fn() }));
vi.mock('@/lib/metric-keys', () => ({
  SPEAKING_METRIC_KEYS: ['connectorRepetition', 'structuralVariety', 'vocabularyPrecision', 'verbAccuracy', 'argumentClosure', 'fillerUsage'] as const,
  isSpeakingMetricKey: vi.fn().mockReturnValue(true),
}));
vi.mock('@/lib/csrf', () => ({
  validateOrigin: vi.fn().mockReturnValue(true),
  csrfForbiddenResponse: vi.fn(),
}));
vi.mock('@/lib/api', () => ({
  validateAudioFile: vi.fn().mockReturnValue({ valid: true }),
  successResponse: (data: unknown, status = 200) => Response.json(data, { status }),
  errorResponse: (message: string, code: string, status: number) =>
    Response.json({ error: message, code }, { status }),
}));

import { POST } from '@/app/api/sessions/route';
import { auth } from '@/features/auth/auth';
import { findOrCreateUser, hasConsent } from '@/lib/db-utils';
import { uploadAudio, generateAudioKey } from '@/lib/storage/r2';
import { enqueueProcessing } from '@/lib/queue/qstash';
import { validateOrigin, csrfForbiddenResponse } from '@/lib/csrf';
import { validateAudioFile } from '@/lib/api';

// Cast mocks for typed access
const mockAuth = vi.mocked(auth);
const mockFindOrCreateUser = vi.mocked(findOrCreateUser);
const mockHasConsent = vi.mocked(hasConsent);
const mockUploadAudio = vi.mocked(uploadAudio);
const mockGenerateAudioKey = vi.mocked(generateAudioKey);
const mockEnqueueProcessing = vi.mocked(enqueueProcessing);
const mockValidateOrigin = vi.mocked(validateOrigin);
const mockCsrfForbiddenResponse = vi.mocked(csrfForbiddenResponse);
vi.mocked(validateAudioFile);

// Shared fixture — base session shape returned by prisma.speakingSession.create
const baseSession = {
  id: 'session-abc',
  userId: 'user-1',
  status: SessionStatus.UPLOADED,
  durationSecs: 30,
  language: 'en',
  topic: null,
  focusMetricKey: null,
  audioUrl: 'sessions/user-1/session-abc/audio.webm',
  intentLabel: null,
  summary: null,
  createdAt: new Date('2026-04-03T00:00:00Z'),
  updatedAt: new Date('2026-04-03T00:00:00Z'),
};

function createSessionRequest(formData?: FormData): Request {
  const fd = formData ?? new FormData();
  return new Request('http://localhost/api/sessions', {
    method: 'POST',
    body: fd,
    headers: { Origin: 'http://localhost:3000' },
  });
}

function createValidFormData(): FormData {
  const fd = new FormData();
  fd.append('audio', new File([new Uint8Array(100)], 'test.webm', { type: 'audio/webm' }));
  fd.append('duration', '30');
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  // Restore CSRF defaults after each test
  mockValidateOrigin.mockReturnValue(true);
});

describe('POST /api/sessions', () => {
  // ─── Test 1: unauthenticated ─────────────────────────────────────────────
  it('returns 401 when the request is unauthenticated', async () => {
    // Arrange
    mockAuth.mockResolvedValueOnce(null as never);

    // Act
    const response = await POST(createSessionRequest());
    const body = await response.json() as { error: string; code: string };

    // Assert
    expect(response.status).toBe(401);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  // ─── Test 2: CSRF rejection ──────────────────────────────────────────────
  it('returns 403 when CSRF origin validation fails', async () => {
    // Arrange
    mockAuth.mockResolvedValueOnce({
      user: { externalId: 'ext-1', email: 'a@b.com', name: 'Test' },
      expires: '',
    } as never);
    mockValidateOrigin.mockReturnValue(false);
    mockCsrfForbiddenResponse.mockReturnValueOnce(
      Response.json({ error: 'Forbidden', code: 'CSRF_REJECTED' }, { status: 403 })
    );

    // Act
    const response = await POST(createSessionRequest());
    const body = await response.json() as { error: string; code: string };

    // Assert
    expect(response.status).toBe(403);
    expect(body.code).toBe('CSRF_REJECTED');
  });

  // ─── Test 3: no recording consent ────────────────────────────────────────
  it('returns 403 CONSENT_REQUIRED when user has not granted audio consent', async () => {
    // Arrange
    mockAuth.mockResolvedValueOnce({
      user: { externalId: 'ext-1', email: 'a@b.com', name: 'Test' },
      expires: '',
    } as never);
    mockFindOrCreateUser.mockResolvedValueOnce({
      id: 'user-1',
      externalId: 'ext-1',
      email: 'a@b.com',
      displayName: 'Test',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockHasConsent.mockResolvedValueOnce(false);

    // Act
    const response = await POST(createSessionRequest());
    const body = await response.json() as { error: string; code: string };

    // Assert
    expect(response.status).toBe(403);
    expect(body.code).toBe('CONSENT_REQUIRED');
  });

  // ─── Test 4: valid request returns 201 ───────────────────────────────────
  it('creates a session and returns 201 with session ID when all inputs are valid', async () => {
    // Arrange
    mockAuth.mockResolvedValueOnce({
      user: { externalId: 'ext-1', email: 'a@b.com', name: 'Test' },
      expires: '',
    } as never);
    mockFindOrCreateUser.mockResolvedValueOnce({
      id: 'user-1',
      externalId: 'ext-1',
      email: 'a@b.com',
      displayName: 'Test',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockHasConsent.mockResolvedValueOnce(true);
    mockGenerateAudioKey.mockReturnValueOnce('sessions/user-1/session-abc/audio.webm');
    mockUploadAudio.mockResolvedValueOnce('sessions/user-1/session-abc/audio.webm');
    mockEnqueueProcessing.mockResolvedValueOnce(undefined);

    prismaMock.speakingSession.create.mockResolvedValueOnce({
      ...baseSession,
      status: SessionStatus.CREATED,
      audioUrl: null,
    } as never);
    prismaMock.speakingSession.update.mockResolvedValueOnce(baseSession as never);

    // Act
    const response = await POST(createSessionRequest(createValidFormData()));
    const body = await response.json() as { id: string; status: string };

    // Assert
    expect(response.status).toBe(201);
    expect(body.id).toBe('session-abc');
    expect(body.status).toBe(SessionStatus.UPLOADED);
  });

  // ─── Test 5: missing audio file returns 400 ──────────────────────────────
  it('returns 400 MISSING_AUDIO when no audio file is provided in FormData', async () => {
    // Arrange
    mockAuth.mockResolvedValueOnce({
      user: { externalId: 'ext-1', email: 'a@b.com', name: 'Test' },
      expires: '',
    } as never);
    mockFindOrCreateUser.mockResolvedValueOnce({
      id: 'user-1',
      externalId: 'ext-1',
      email: 'a@b.com',
      displayName: 'Test',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockHasConsent.mockResolvedValueOnce(true);

    const fd = new FormData();
    fd.append('duration', '30');
    // no audio field

    // Act
    const response = await POST(createSessionRequest(fd));
    const body = await response.json() as { error: string; code: string };

    // Assert
    expect(response.status).toBe(400);
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  // ─── Test 6: database error returns 500 ──────────────────────────────────
  it('returns 500 INTERNAL_ERROR when the database throws during session creation', async () => {
    // Arrange
    mockAuth.mockResolvedValueOnce({
      user: { externalId: 'ext-1', email: 'a@b.com', name: 'Test' },
      expires: '',
    } as never);
    mockFindOrCreateUser.mockResolvedValueOnce({
      id: 'user-1',
      externalId: 'ext-1',
      email: 'a@b.com',
      displayName: 'Test',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockHasConsent.mockResolvedValueOnce(true);
    prismaMock.speakingSession.create.mockRejectedValueOnce(new Error('DB connection failed'));

    // Act
    const response = await POST(createSessionRequest(createValidFormData()));
    const body = await response.json() as { error: string; code: string };

    // Assert
    expect(response.status).toBe(500);
    expect(body.code).toBe('INTERNAL_ERROR');
  });
});
