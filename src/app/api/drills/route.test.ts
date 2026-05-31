// Tests for POST /api/drills — auth, CSRF, validation, and successful drill creation
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '@/__mocks__/prisma';

// --- Module mocks ---
vi.mock('@/features/auth/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/db-utils', () => ({ findOrCreateUser: vi.fn() }));
vi.mock('@/features/training/generateDrill', () => ({ generateDrill: vi.fn() }));
const mockChildLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: vi.fn() };
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: vi.fn(() => mockChildLogger) } }));
vi.mock('@/lib/csrf', () => ({
  validateOrigin: vi.fn().mockReturnValue(true),
  csrfForbiddenResponse: vi.fn(),
}));

import { POST, GET } from '@/app/api/drills/route';
import { auth } from '@/features/auth/auth';
import { findOrCreateUser } from '@/lib/db-utils';
import { generateDrill } from '@/features/training/generateDrill';
import { validateOrigin, csrfForbiddenResponse } from '@/lib/csrf';

// --- Typed mock references ---
const mockAuth = vi.mocked(auth);
const mockFindOrCreateUser = vi.mocked(findOrCreateUser);
const mockGenerateDrill = vi.mocked(generateDrill);
const mockValidateOrigin = vi.mocked(validateOrigin);
const mockCsrfForbiddenResponse = vi.mocked(csrfForbiddenResponse);

// --- Fixtures ---
const mockAuthSession = {
  user: { externalId: 'ext-1', email: 'test@test.com', name: 'Test' },
};

const mockUser = { id: 'user-1', externalId: 'ext-1', email: 'test@test.com' };

const mockDrillPrompt = {
  drillType: 'rephrase' as const,
  metricKey: 'connectorRepetition',
  prompt: 'Rephrase this sentence...',
  sourceExample: 'I use so a lot',
  timeLimit: 60,
};

const validBody = {
  drillType: 'rephrase',
  metricKey: 'connectorRepetition',
  recentExamples: ['I use so a lot'],
  focusPattern: 'Connector overuse',
};

function createDrillRequest(body: unknown): Request {
  return new Request('http://localhost/api/drills', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000' },
    body: JSON.stringify(body),
  });
}

// --- Tests ---
describe('POST /api/drills', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateOrigin.mockReturnValue(true);
  });

  it('returns 401 when unauthenticated', async () => {
    // Arrange
    mockAuth.mockResolvedValueOnce(null as never);
    const request = createDrillRequest(validBody);

    // Act
    const response = await POST(request);
    const json = await response.json();

    // Assert
    expect(response.status).toBe(401);
    expect(json.code).toBe('UNAUTHORIZED');
  });

  it('returns 403 when CSRF origin validation fails', async () => {
    // Arrange — auth is called twice per request (wrapper + handler), both must return the session
    mockAuth.mockResolvedValue(mockAuthSession as never);
    mockValidateOrigin.mockReturnValue(false);
    mockCsrfForbiddenResponse.mockReturnValue(
      Response.json({ error: 'Forbidden', code: 'CSRF_FORBIDDEN' }, { status: 403 }),
    );
    const request = createDrillRequest(validBody);

    // Act
    const response = await POST(request);

    // Assert
    expect(mockValidateOrigin).toHaveBeenCalledWith(request);
    expect(mockCsrfForbiddenResponse).toHaveBeenCalledOnce();
    expect(response.status).toBe(403);
  });

  it('creates drill and returns 200 on valid request', async () => {
    // Arrange — auth is called twice per request (wrapper + handler), both must return the session
    mockAuth.mockResolvedValue(mockAuthSession as never);
    mockFindOrCreateUser.mockResolvedValueOnce(mockUser as never);
    mockGenerateDrill.mockResolvedValueOnce(mockDrillPrompt);

    const mockCreatedDrill = {
      id: 'drill-1',
      drillType: mockDrillPrompt.drillType,
      metricKey: mockDrillPrompt.metricKey,
      prompt: mockDrillPrompt.prompt,
      sourceExample: mockDrillPrompt.sourceExample,
    };
    prismaMock.drillAttempt.create.mockResolvedValueOnce(mockCreatedDrill as never);

    const request = createDrillRequest(validBody);

    // Act
    const response = await POST(request);
    const json = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(json.id).toBe('drill-1');
    expect(json.drillType).toBe('rephrase');
    expect(json.metricKey).toBe('connectorRepetition');
    expect(json.prompt).toBe('Rephrase this sentence...');
    expect(json.timeLimit).toBe(60);

    expect(mockFindOrCreateUser).toHaveBeenCalledWith('ext-1', {
      email: 'test@test.com',
      displayName: 'Test',
    });
    expect(mockGenerateDrill).toHaveBeenCalledWith({
      drillType: 'rephrase',
      metricKey: 'connectorRepetition',
      recentExamples: ['I use so a lot'],
      focusPattern: 'Connector overuse',
      intentLabel: undefined,
      sessionTranscript: undefined,
    });
    expect(prismaMock.drillAttempt.create).toHaveBeenCalledOnce();
  });

  it('returns 400 when required fields are missing (Zod validation failure)', async () => {
    // Arrange — auth is called twice per request (wrapper + handler), both must return the session
    mockAuth.mockResolvedValue(mockAuthSession as never);
    mockFindOrCreateUser.mockResolvedValueOnce(mockUser as never);

    const incompleteBody = { drillType: 'rephrase' }; // missing metricKey, recentExamples, focusPattern
    const request = createDrillRequest(incompleteBody);

    // Act
    const response = await POST(request);
    const json = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(json.code).toBe('INVALID_BODY');
    expect(mockGenerateDrill).not.toHaveBeenCalled();
  });

  it('returns 400 when the request body is not valid JSON', async () => {
    // Arrange — auth is called twice per request (wrapper + handler), both must return the session
    mockAuth.mockResolvedValue(mockAuthSession as never);
    mockFindOrCreateUser.mockResolvedValueOnce(mockUser as never);

    const request = new Request('http://localhost/api/drills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000' },
      body: 'not-valid-json{{{',
    });

    // Act
    const response = await POST(request);
    const json = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(json.code).toBe('INVALID_JSON');
    expect(mockGenerateDrill).not.toHaveBeenCalled();
  });
});

describe('GET /api/drills', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns Cache-Control: private, no-store', async () => {
    // auth is called twice per request (wrapper + handler)
    mockAuth.mockResolvedValue(mockAuthSession as never);
    mockFindOrCreateUser.mockResolvedValueOnce(mockUser as never);
    prismaMock.drillAttempt.findMany.mockResolvedValueOnce([]);
    prismaMock.drillAttempt.count.mockResolvedValueOnce(0);
    prismaMock.drillAttempt.count.mockResolvedValueOnce(0);
    prismaMock.drillAttempt.count.mockResolvedValueOnce(0);
    vi.mocked(prismaMock.drillAttempt.groupBy).mockResolvedValueOnce([] as never);

    const request = new Request('http://localhost/api/drills');
    const response = await GET(request, { params: Promise.resolve({}) });

    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });
});
