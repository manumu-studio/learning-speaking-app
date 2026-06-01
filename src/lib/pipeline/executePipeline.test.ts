// Unit tests for executePipeline — covers all steps, both production and dev modes
import { describe, it, expect, vi } from 'vitest';
import { prismaMock } from '@/__mocks__/prisma';
import { SessionStatus } from '@prisma/client';

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));

vi.mock('@/lib/ai/whisper', () => ({
  transcribeAudio: vi.fn(),
}));

vi.mock('@/lib/ai/analyze', () => ({
  analyzeTranscript: vi.fn(),
}));

vi.mock('@/lib/storage/r2', () => ({
  getAudio: vi.fn(),
  deleteAudio: vi.fn(),
}));

vi.mock('@/features/session/updatePatternProfile', () => ({
  updatePatternProfile: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Mock env — prevents Zod from parsing process.env in CI where vars are absent.
// AZURE_SPEECH_KEY left undefined so the Azure block is skipped in all pipeline tests.
vi.mock('@/lib/env', () => ({
  env: {
    AZURE_SPEECH_KEY: undefined,
    AZURE_SPEECH_REGION: undefined,
    NODE_ENV: 'test',
  },
}));

// Mock transcode so tests don't spawn ffmpeg
vi.mock('@/lib/audio/transcode', () => ({
  toPcm16kMonoWav: vi.fn().mockResolvedValue(Buffer.from('pcm-audio')),
}));

// Mock Azure and L1 tagger — not exercised in unit tests (no credentials)
vi.mock('@/lib/ai/azurePronunciation', () => ({
  assessPronunciation: vi.fn(),
}));

vi.mock('@/lib/ai/l1Spanish', () => ({
  tagSpanishL1: vi.fn((words: unknown) => words),
}));

// Mock persistPronunciation — tested separately
vi.mock('@/lib/pipeline/persistPronunciation', () => ({
  persistPronunciation: vi.fn(),
}));

vi.mock('@/lib/observability', () => ({
  logPipelineStage: vi.fn(),
  withObservability: vi.fn(),
  getRequestId: vi.fn(),
  withRequestId: vi.fn(),
  currentRequestId: vi.fn(),
  setSentryRequestContext: vi.fn(),
}));

import { executePipeline } from './executePipeline';
import { transcribeAudio } from '@/lib/ai/whisper';
import { analyzeTranscript } from '@/lib/ai/analyze';
import { getAudio, deleteAudio } from '@/lib/storage/r2';
import { updatePatternProfile } from '@/features/session/updatePatternProfile';

// ---------------------------------------------------------------------------
// Shared mock data
// ---------------------------------------------------------------------------

const mockSession = {
  id: 'session-1',
  userId: 'user-1',
  status: SessionStatus.UPLOADED as SessionStatus,
  audioUrl: 'sessions/user-1/session-1/audio.webm',
  focusMetricKey: null,
};

const mockAnalysis = {
  insights: [
    {
      category: 'grammar' as const,
      pattern: 'Missing articles',
      detail: 'Frequently omits articles',
      frequency: 5,
      severity: 'high' as const,
      examples: ['I went to store', 'she is teacher'],
      suggestion: 'Add articles',
    },
  ],
  metrics: [
    {
      key: 'connectorRepetition' as const,
      level: 'medium' as const,
      score: 5,
      note: 'Test note',
    },
  ],
  focusNext: 'Focus on articles',
  summary: 'Good overall',
  intentLabel: 'Daily practice',
};

// ---------------------------------------------------------------------------
// Helper: set up the "happy path" mocks for every step
// ---------------------------------------------------------------------------

function setupHappyPath(sessionOverride?: Partial<typeof mockSession>): void {
  const session = { ...mockSession, ...sessionOverride };

  prismaMock.speakingSession.findUnique.mockResolvedValue(session as never);
  prismaMock.speakingSession.update.mockResolvedValue(session as never);
  (getAudio as ReturnType<typeof vi.fn>).mockResolvedValue(Buffer.from('audio'));
  (transcribeAudio as ReturnType<typeof vi.fn>).mockResolvedValue({
    text: 'I went to store. I went to store again. she is teacher.',
    language: 'en',
    segments: [
      {
        id: 0,
        start: 0,
        end: 1,
        text: 'I went to store. I went to store again. she is teacher.',
        avg_logprob: -0.2,
        no_speech_prob: 0.1,
        compression_ratio: 1.2,
      },
    ],
  });
  prismaMock.transcript.create.mockResolvedValue({} as never);
  prismaMock.transcript.upsert.mockResolvedValue({} as never);
  (deleteAudio as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  (analyzeTranscript as ReturnType<typeof vi.fn>).mockResolvedValue(mockAnalysis);
  prismaMock.insight.deleteMany.mockResolvedValue({ count: 0 } as never);
  prismaMock.insight.createMany.mockResolvedValue({ count: 1 } as never);
  prismaMock.metricSnapshot.deleteMany.mockResolvedValue({ count: 0 } as never);
  prismaMock.metricSnapshot.createMany.mockResolvedValue({ count: 1 } as never);
  prismaMock.metricSnapshot.findMany.mockResolvedValue([]);
  prismaMock.user.update.mockResolvedValue({} as never);
  (updatePatternProfile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('executePipeline', () => {
  it('production mode: UPLOADED session processes successfully and marks DONE', async () => {
    // Arrange
    setupHappyPath({ status: SessionStatus.UPLOADED });

    // Act
    await executePipeline('session-1', 'production');

    // Assert — final update must set status to DONE
    const updateCalls = prismaMock.speakingSession.update.mock.calls;
    const doneCall = updateCalls.find(
      ([args]) => (args as { data: { status?: string } }).data.status === SessionStatus.DONE
    );
    expect(doneCall).toBeDefined();
  });

  it('production mode: session with DONE status throws invalid state error', async () => {
    // Arrange
    prismaMock.speakingSession.findUnique.mockResolvedValue({
      ...mockSession,
      status: SessionStatus.DONE,
    } as never);

    // Act & Assert
    await expect(executePipeline('session-1', 'production')).rejects.toThrow(
      /invalid state/i
    );
  });

  it('dev mode: session with DONE status processes successfully without throwing', async () => {
    // Arrange
    setupHappyPath({ status: SessionStatus.DONE });

    // Act & Assert — should not throw
    await expect(executePipeline('session-1', 'dev')).resolves.toBeUndefined();
  });

  it('dev mode: transcript is upserted instead of created', async () => {
    // Arrange
    setupHappyPath();

    // Act
    await executePipeline('session-1', 'dev');

    // Assert
    expect(prismaMock.transcript.upsert).toHaveBeenCalledOnce();
    expect(prismaMock.transcript.create).not.toHaveBeenCalled();
  });

  it('dev mode: existing insights are deleted before re-creation', async () => {
    // Arrange
    setupHappyPath();

    // Act
    await executePipeline('session-1', 'dev');

    // Assert — deleteMany must have been called before createMany
    const deleteManyOrder = prismaMock.insight.deleteMany.mock.invocationCallOrder[0];
    const createManyOrder = prismaMock.insight.createMany.mock.invocationCallOrder[0];
    expect(deleteManyOrder).toBeDefined();
    expect(createManyOrder).toBeDefined();
    expect(deleteManyOrder!).toBeLessThan(createManyOrder!);
  });

  it('production mode: transcript is created instead of upserted', async () => {
    // Arrange
    setupHappyPath({ status: SessionStatus.UPLOADED });

    // Act
    await executePipeline('session-1', 'production');

    // Assert
    expect(prismaMock.transcript.create).toHaveBeenCalledOnce();
    expect(prismaMock.transcript.upsert).not.toHaveBeenCalled();
  });

  it('transcription failure marks pipeline as failed and propagates error', async () => {
    // Arrange
    setupHappyPath();
    (transcribeAudio as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Whisper API unavailable')
    );

    // Act & Assert
    await expect(executePipeline('session-1', 'production')).rejects.toThrow(
      'Whisper API unavailable'
    );
  });

  it('analysis failure propagates error', async () => {
    // Arrange
    setupHappyPath();
    (analyzeTranscript as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Claude API error')
    );

    // Act & Assert
    await expect(executePipeline('session-1', 'production')).rejects.toThrow(
      'Claude API error'
    );
  });

  it('R2 audio deletion failure is caught and pipeline completes successfully', async () => {
    // Arrange
    setupHappyPath();
    (deleteAudio as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('R2 deletion failed')
    );

    // Act — pipeline must not throw despite deleteAudio failure
    await expect(executePipeline('session-1', 'production')).resolves.toBeUndefined();

    // Assert — pipeline reached the DONE status update
    const updateCalls = prismaMock.speakingSession.update.mock.calls;
    const doneCall = updateCalls.find(
      ([args]) => (args as { data: { status?: string } }).data.status === SessionStatus.DONE
    );
    expect(doneCall).toBeDefined();
  });

  it('MetricSnapshot createMany is called with skipDuplicates: true', async () => {
    // Arrange
    setupHappyPath();

    // Act
    await executePipeline('session-1', 'production');

    // Assert
    expect(prismaMock.metricSnapshot.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true })
    );
  });

  it('updatePatternProfile is called with correct userId and insights after analysis', async () => {
    // Arrange
    setupHappyPath();

    // Act
    await executePipeline('session-1', 'production');

    // Assert
    expect(updatePatternProfile).toHaveBeenCalledWith('user-1', mockAnalysis.insights);
  });

  it('session not found throws with descriptive error', async () => {
    // Arrange
    prismaMock.speakingSession.findUnique.mockResolvedValue(null);

    // Act & Assert
    await expect(executePipeline('session-1', 'production')).rejects.toThrow(
      /session not found/i
    );
  });
});
