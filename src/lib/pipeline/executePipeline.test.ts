// Tests for shared pipeline — PipelineHttpError and executePipeline
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks ---
vi.mock('@/lib/prisma', () => ({
  prisma: {
    speakingSession: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    transcript: {
      create: vi.fn(),
      upsert: vi.fn(),
    },
    insight: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    metricSnapshot: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/storage/r2', () => ({
  getAudio: vi.fn(),
  deleteAudio: vi.fn(),
}));

vi.mock('@/lib/ai/whisper', () => ({
  transcribeAudio: vi.fn(),
}));

vi.mock('@/lib/ai/analyze', () => ({
  analyzeTranscript: vi.fn(),
}));

vi.mock('@/features/session/updatePatternProfile', () => ({
  updatePatternProfile: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  log: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import { getAudio, deleteAudio } from '@/lib/storage/r2';
import { transcribeAudio } from '@/lib/ai/whisper';
import { analyzeTranscript } from '@/lib/ai/analyze';
import { updatePatternProfile } from '@/features/session/updatePatternProfile';
import { PipelineHttpError, executePipeline } from '@/lib/pipeline/executePipeline';

// SessionStatus values matching Prisma schema
const SessionStatus = {
  UPLOADED: 'UPLOADED',
  TRANSCRIBING: 'TRANSCRIBING',
  ANALYZING: 'ANALYZING',
  DONE: 'DONE',
  FAILED: 'FAILED',
} as const;

const mockPrisma = prisma as {
  speakingSession: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  transcript: {
    create: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
  };
  insight: {
    deleteMany: ReturnType<typeof vi.fn>;
    createMany: ReturnType<typeof vi.fn>;
  };
  metricSnapshot: {
    deleteMany: ReturnType<typeof vi.fn>;
    createMany: ReturnType<typeof vi.fn>;
  };
};

const mockGetAudio = getAudio as ReturnType<typeof vi.fn>;
const mockDeleteAudio = deleteAudio as ReturnType<typeof vi.fn>;
const mockTranscribeAudio = transcribeAudio as ReturnType<typeof vi.fn>;
const mockAnalyzeTranscript = analyzeTranscript as ReturnType<typeof vi.fn>;
const mockUpdatePatternProfile = updatePatternProfile as ReturnType<typeof vi.fn>;

const baseSession = {
  id: 'session-1',
  userId: 'user-1',
  status: SessionStatus.UPLOADED,
  audioUrl: 'audio/session-1.webm',
  focusMetricKey: 'precision',
};

const baseAnalysis = {
  insights: [
    {
      category: 'grammar',
      pattern: 'Missing articles',
      detail: 'Omits "the"',
      frequency: null,
      severity: null,
      examples: null,
      suggestion: null,
    },
  ],
  metrics: [],
  focusNext: 'Practice articles',
  summary: 'Good overall',
  intentLabel: 'Language learning',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.speakingSession.findUnique.mockResolvedValue(baseSession);
  mockPrisma.speakingSession.update.mockResolvedValue({});
  mockPrisma.transcript.create.mockResolvedValue({});
  mockPrisma.transcript.upsert.mockResolvedValue({});
  mockPrisma.insight.deleteMany.mockResolvedValue({ count: 0 });
  mockPrisma.insight.createMany.mockResolvedValue({ count: 1 });
  mockPrisma.metricSnapshot.deleteMany.mockResolvedValue({ count: 0 });
  mockPrisma.metricSnapshot.createMany.mockResolvedValue({ count: 0 });
  mockGetAudio.mockResolvedValue(Buffer.from('audio-data'));
  mockDeleteAudio.mockResolvedValue(undefined);
  mockTranscribeAudio.mockResolvedValue('hello world three words');
  mockAnalyzeTranscript.mockResolvedValue(baseAnalysis);
  mockUpdatePatternProfile.mockResolvedValue(undefined);
});

// ─── PipelineHttpError ────────────────────────────────────────────────────────

describe('PipelineHttpError', () => {
  it('stores message, status, and code', () => {
    const err = new PipelineHttpError('Session not found', 404, 'NOT_FOUND');
    expect(err.message).toBe('Session not found');
    expect(err.status).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
  });

  it('has name PipelineHttpError', () => {
    const err = new PipelineHttpError('fail', 400, 'BAD');
    expect(err.name).toBe('PipelineHttpError');
  });

  it('is an instance of Error', () => {
    const err = new PipelineHttpError('oops', 500, 'ERR');
    expect(err).toBeInstanceOf(Error);
  });

  it('is an instance of PipelineHttpError', () => {
    const err = new PipelineHttpError('oops', 500, 'ERR');
    expect(err).toBeInstanceOf(PipelineHttpError);
  });
});

// ─── executePipeline — guard conditions ──────────────────────────────────────

describe('executePipeline — session not found', () => {
  it('throws PipelineHttpError(404, NOT_FOUND) when session does not exist', async () => {
    mockPrisma.speakingSession.findUnique.mockResolvedValue(null);

    await expect(executePipeline('missing-id', 'production')).rejects.toThrow(PipelineHttpError);
    await expect(executePipeline('missing-id', 'production')).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  it('throws NOT_FOUND in dev mode too', async () => {
    mockPrisma.speakingSession.findUnique.mockResolvedValue(null);

    await expect(executePipeline('missing-id', 'dev')).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });
});

describe('executePipeline — invalid session state', () => {
  it('throws PipelineHttpError(400, INVALID_STATE) when session is DONE', async () => {
    mockPrisma.speakingSession.findUnique.mockResolvedValue({
      ...baseSession,
      status: SessionStatus.DONE,
    });

    await expect(executePipeline('session-1', 'production')).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_STATE',
    });
  });

  it('throws PipelineHttpError(400, INVALID_STATE) when session is FAILED', async () => {
    mockPrisma.speakingSession.findUnique.mockResolvedValue({
      ...baseSession,
      status: SessionStatus.FAILED,
    });

    await expect(executePipeline('session-1', 'production')).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_STATE',
    });
  });

  it('uses session-specific message in dev mode for invalid state', async () => {
    mockPrisma.speakingSession.findUnique.mockResolvedValue({
      ...baseSession,
      status: SessionStatus.DONE,
    });

    await expect(executePipeline('session-1', 'dev')).rejects.toMatchObject({
      message: 'Session in wrong state: DONE',
    });
  });

  it('uses generic message in production mode for invalid state', async () => {
    mockPrisma.speakingSession.findUnique.mockResolvedValue({
      ...baseSession,
      status: SessionStatus.DONE,
    });

    await expect(executePipeline('session-1', 'production')).rejects.toMatchObject({
      message: 'Session already processed or in wrong state',
    });
  });
});

describe('executePipeline — missing audio URL', () => {
  it('throws PipelineHttpError(400, BAD_REQUEST) in dev mode when audioUrl is null', async () => {
    mockPrisma.speakingSession.findUnique.mockResolvedValue({
      ...baseSession,
      audioUrl: null,
    });

    await expect(executePipeline('session-1', 'dev')).rejects.toMatchObject({
      status: 400,
      code: 'BAD_REQUEST',
    });
  });

  it('throws a generic Error (not PipelineHttpError) in production when audioUrl is null', async () => {
    mockPrisma.speakingSession.findUnique.mockResolvedValue({
      ...baseSession,
      audioUrl: null,
    });

    const error = await executePipeline('session-1', 'production').catch((e) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(PipelineHttpError);
    expect(error.message).toBe('Session missing audio URL');
  });
});

// ─── executePipeline — retriable statuses ────────────────────────────────────

describe('executePipeline — retriable statuses proceed normally', () => {
  it.each([SessionStatus.UPLOADED, SessionStatus.TRANSCRIBING, SessionStatus.ANALYZING])(
    'accepts session in %s status',
    async (status) => {
      mockPrisma.speakingSession.findUnique.mockResolvedValue({ ...baseSession, status });

      const result = await executePipeline('session-1', 'production');
      expect(result).toMatchObject({ insightCount: expect.any(Number) });
    }
  );
});

// ─── executePipeline — return value ──────────────────────────────────────────

describe('executePipeline — return value', () => {
  it('returns insightCount, wordCount, and summary', async () => {
    mockTranscribeAudio.mockResolvedValue('one two three four five');

    const result = await executePipeline('session-1', 'production');

    expect(result).toEqual({
      insightCount: 1,
      wordCount: 5,
      summary: 'Good overall',
    });
  });

  it('counts word count from transcript', async () => {
    mockTranscribeAudio.mockResolvedValue('one two three');

    const result = await executePipeline('session-1', 'production');
    expect(result.wordCount).toBe(3);
  });

  it('returns summary null when analysis has null summary', async () => {
    mockAnalyzeTranscript.mockResolvedValue({ ...baseAnalysis, summary: null });

    const result = await executePipeline('session-1', 'production');
    expect(result.summary).toBeNull();
  });

  it('returns insightCount matching analysis insights array length', async () => {
    const manyInsights = Array.from({ length: 3 }, (_, i) => ({
      category: 'grammar',
      pattern: `Pattern ${i}`,
      detail: `Detail ${i}`,
      frequency: null,
      severity: null,
      examples: null,
      suggestion: null,
    }));
    mockAnalyzeTranscript.mockResolvedValue({ ...baseAnalysis, insights: manyInsights });

    const result = await executePipeline('session-1', 'production');
    expect(result.insightCount).toBe(3);
  });
});

// ─── executePipeline — transcript persistence mode ───────────────────────────

describe('executePipeline — transcript persistence', () => {
  it('uses transcript.create in production mode', async () => {
    await executePipeline('session-1', 'production');

    expect(mockPrisma.transcript.create).toHaveBeenCalledOnce();
    expect(mockPrisma.transcript.upsert).not.toHaveBeenCalled();
  });

  it('uses transcript.upsert in dev mode', async () => {
    await executePipeline('session-1', 'dev');

    expect(mockPrisma.transcript.upsert).toHaveBeenCalledOnce();
    expect(mockPrisma.transcript.create).not.toHaveBeenCalled();
  });

  it('stores correct word count and text in production', async () => {
    mockTranscribeAudio.mockResolvedValue('one two three');
    await executePipeline('session-1', 'production');

    expect(mockPrisma.transcript.create).toHaveBeenCalledWith({
      data: { sessionId: 'session-1', text: 'one two three', wordCount: 3 },
    });
  });
});

// ─── executePipeline — insight deletion in dev mode ──────────────────────────

describe('executePipeline — insight cleanup', () => {
  it('deletes existing insights before creating in dev mode', async () => {
    await executePipeline('session-1', 'dev');

    expect(mockPrisma.insight.deleteMany).toHaveBeenCalledWith({ where: { sessionId: 'session-1' } });
  });

  it('does not delete insights in production mode', async () => {
    await executePipeline('session-1', 'production');

    expect(mockPrisma.insight.deleteMany).not.toHaveBeenCalled();
  });
});

// ─── executePipeline — metric snapshot cleanup in dev mode ───────────────────

describe('executePipeline — metric snapshot handling', () => {
  it('deletes existing snapshots in dev mode when metrics are present', async () => {
    mockAnalyzeTranscript.mockResolvedValue({
      ...baseAnalysis,
      metrics: [{ key: 'precision', level: 'intermediate', score: 0.7, note: 'ok' }],
    });

    await executePipeline('session-1', 'dev');

    expect(mockPrisma.metricSnapshot.deleteMany).toHaveBeenCalledWith({
      where: { sessionId: 'session-1' },
    });
  });

  it('does not delete snapshots in production mode', async () => {
    mockAnalyzeTranscript.mockResolvedValue({
      ...baseAnalysis,
      metrics: [{ key: 'precision', level: 'intermediate', score: 0.7, note: 'ok' }],
    });

    await executePipeline('session-1', 'production');

    expect(mockPrisma.metricSnapshot.deleteMany).not.toHaveBeenCalled();
  });

  it('skips metricSnapshot.createMany when metrics array is empty', async () => {
    mockAnalyzeTranscript.mockResolvedValue({ ...baseAnalysis, metrics: [] });

    await executePipeline('session-1', 'production');

    expect(mockPrisma.metricSnapshot.createMany).not.toHaveBeenCalled();
  });
});

// ─── executePipeline — session status progression ────────────────────────────

describe('executePipeline — status transitions', () => {
  it('marks session TRANSCRIBING, then ANALYZING, then DONE', async () => {
    await executePipeline('session-1', 'production');

    const calls = mockPrisma.speakingSession.update.mock.calls;
    const statusValues = calls
      .filter((c) => c[0]?.data?.status !== undefined)
      .map((c) => c[0].data.status);

    expect(statusValues).toContain(SessionStatus.TRANSCRIBING);
    expect(statusValues).toContain(SessionStatus.ANALYZING);
    expect(statusValues).toContain(SessionStatus.DONE);
  });

  it('records audioDeletedAt after deleting audio', async () => {
    await executePipeline('session-1', 'production');

    const updateCalls = mockPrisma.speakingSession.update.mock.calls;
    const audioDeletedCall = updateCalls.find((c) => c[0]?.data?.audioDeletedAt !== undefined);
    expect(audioDeletedCall).toBeDefined();
    expect(audioDeletedCall![0].data.audioDeletedAt).toBeInstanceOf(Date);
  });
});

// ─── executePipeline — external service calls ────────────────────────────────

describe('executePipeline — external service interactions', () => {
  it('downloads audio using the session audioUrl', async () => {
    await executePipeline('session-1', 'production');

    expect(mockGetAudio).toHaveBeenCalledWith('audio/session-1.webm');
  });

  it('transcribes using the audio buffer and session filename', async () => {
    const fakeBuffer = Buffer.from('fake-audio');
    mockGetAudio.mockResolvedValue(fakeBuffer);

    await executePipeline('session-1', 'production');

    expect(mockTranscribeAudio).toHaveBeenCalledWith(fakeBuffer, 'session-session-1.webm');
  });

  it('deletes audio from R2 after transcription', async () => {
    await executePipeline('session-1', 'production');

    expect(mockDeleteAudio).toHaveBeenCalledWith('audio/session-1.webm');
  });

  it('calls updatePatternProfile with userId and insights', async () => {
    await executePipeline('session-1', 'production');

    expect(mockUpdatePatternProfile).toHaveBeenCalledWith('user-1', baseAnalysis.insights);
  });

  it('analyzes transcript with focusMetricKey from session', async () => {
    await executePipeline('session-1', 'production');

    expect(mockAnalyzeTranscript).toHaveBeenCalledWith('hello world three words', 'precision');
  });
});