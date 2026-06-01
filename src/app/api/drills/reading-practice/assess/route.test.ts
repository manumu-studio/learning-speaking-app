// Tests for POST /api/drills/reading-practice/assess — CSRF guard, auth guard, FormData validation, and pronunciation scoring
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Polyfill File for Node environment — route logic uses `instanceof File`
import { File as NodeFile } from 'buffer';
if (typeof File === 'undefined') {
  (globalThis as unknown as Record<string, unknown>).File = NodeFile;
}

// --- Module mocks ---
vi.mock('@/features/auth/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));
vi.mock('@/lib/csrf', () => ({
  validateOrigin: vi.fn().mockReturnValue(true),
  csrfForbiddenResponse: vi.fn(),
}));
vi.mock('@/lib/api', () => ({
  successResponse: (data: unknown, status = 200) => Response.json(data, { status }),
  errorResponse: (message: string, code: string, status: number) =>
    Response.json({ error: message, code }, { status }),
}));
vi.mock('@/lib/ai/azurePronunciation', () => ({
  assessPronunciation: vi.fn(),
}));
vi.mock('@/lib/env', () => ({
  env: {
    AZURE_SPEECH_KEY: 'test-key',
    AZURE_SPEECH_REGION: 'eastus',
  },
}));

import { POST } from '@/app/api/drills/reading-practice/assess/route';
import { auth } from '@/features/auth/auth';
import { validateOrigin, csrfForbiddenResponse } from '@/lib/csrf';
import { assessPronunciation } from '@/lib/ai/azurePronunciation';
import { env } from '@/lib/env';

// --- Typed mock references ---
const mockAuth = vi.mocked(auth);
const mockValidateOrigin = vi.mocked(validateOrigin);
const mockCsrfForbiddenResponse = vi.mocked(csrfForbiddenResponse);
const mockAssessPronunciation = vi.mocked(assessPronunciation);

// --- Fixtures ---
const mockAuthSession = {
  user: { externalId: 'ext-1', email: 'user@test.com', name: 'Test User' },
  expires: '',
};

const mockPronunciationResult = {
  pronScore: 88,
  accuracyScore: 90,
  fluencyScore: 85,
  completenessScore: 92,
  prosodyScore: 80,
  words: [
    { word: 'hello', accuracyScore: 95, errorType: 'None' as const },
    { word: 'world', accuracyScore: 82, errorType: 'None' as const },
  ],
};

function createAudioFile(sizeBytes = 1024): File {
  const bytes = new Uint8Array(sizeBytes);
  return new File([bytes], 'recording.wav', { type: 'audio/wav' });
}

function createAssessRequest(formData: FormData): Request {
  return new Request('http://localhost/api/drills/reading-practice/assess', {
    method: 'POST',
    body: formData,
    headers: { Origin: 'http://localhost:3000' },
  });
}

function createValidFormData(): FormData {
  const fd = new FormData();
  fd.append('audio', createAudioFile());
  fd.append('referenceText', 'Hello world');
  return fd;
}

// --- Tests ---
describe('POST /api/drills/reading-practice/assess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore safe defaults after each test
    mockValidateOrigin.mockReturnValue(true);
    // env is a plain object mock — reset its values to configured state
    (env as Record<string, string | undefined>).AZURE_SPEECH_KEY = 'test-key';
    (env as Record<string, string | undefined>).AZURE_SPEECH_REGION = 'eastus';
  });

  it('returns 403 when CSRF origin validation fails', async () => {
    // Arrange
    mockAuth.mockResolvedValue(mockAuthSession as never);
    mockValidateOrigin.mockReturnValue(false);
    mockCsrfForbiddenResponse.mockReturnValue(
      Response.json({ error: 'Forbidden', code: 'CSRF_FORBIDDEN' }, { status: 403 }),
    );

    // Act
    const response = await POST(createAssessRequest(createValidFormData()));

    // Assert
    expect(response.status).toBe(403);
    expect(mockCsrfForbiddenResponse).toHaveBeenCalledOnce();
    expect(mockAssessPronunciation).not.toHaveBeenCalled();
  });

  it('returns 401 when not authenticated', async () => {
    // Arrange
    mockAuth.mockResolvedValue(null as never);

    // Act
    const response = await POST(createAssessRequest(createValidFormData()));
    const body = await response.json() as { error: string; code: string };

    // Assert
    expect(response.status).toBe(401);
    expect(body.code).toBe('UNAUTHORIZED');
    expect(mockAssessPronunciation).not.toHaveBeenCalled();
  });

  it('returns 400 when audio file is missing from FormData', async () => {
    // Arrange
    mockAuth.mockResolvedValue(mockAuthSession as never);

    const fd = new FormData();
    fd.append('referenceText', 'Hello world');
    // no audio field

    // Act
    const response = await POST(createAssessRequest(fd));
    const body = await response.json() as { error: string; code: string };

    // Assert
    expect(response.status).toBe(400);
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(mockAssessPronunciation).not.toHaveBeenCalled();
  });

  it('returns 400 when reference text is missing from FormData', async () => {
    // Arrange
    mockAuth.mockResolvedValue(mockAuthSession as never);

    const fd = new FormData();
    fd.append('audio', createAudioFile());
    // no referenceText field

    // Act
    const response = await POST(createAssessRequest(fd));
    const body = await response.json() as { error: string; code: string };

    // Assert
    expect(response.status).toBe(400);
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(mockAssessPronunciation).not.toHaveBeenCalled();
  });

  it('returns pronunciation scores on successful assessment', async () => {
    // Arrange
    mockAuth.mockResolvedValue(mockAuthSession as never);
    mockAssessPronunciation.mockResolvedValueOnce(mockPronunciationResult as never);

    // Act
    const response = await POST(createAssessRequest(createValidFormData()));
    const body = await response.json() as {
      pronScore: number;
      accuracyScore: number;
      fluencyScore: number;
      completenessScore: number;
      prosodyScore: number;
      words: Array<{ word: string; accuracyScore: number; errorType: string }>;
    };

    // Assert
    expect(response.status).toBe(200);
    expect(body.pronScore).toBe(88);
    expect(body.accuracyScore).toBe(90);
    expect(body.fluencyScore).toBe(85);
    expect(body.completenessScore).toBe(92);
    expect(body.prosodyScore).toBe(80);
    expect(body.words).toHaveLength(2);
    expect(body.words[0]).toEqual({ word: 'hello', accuracyScore: 95, errorType: 'None' });

    expect(mockAssessPronunciation).toHaveBeenCalledWith(
      expect.any(Buffer),
      'Hello world',
      'test-key',
      'eastus',
    );
  });
});
