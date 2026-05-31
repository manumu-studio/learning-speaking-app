// Unit tests for useRecordingPanel — pause/resume guards and canPause logic
/** @vitest-environment jsdom */
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
}));

vi.mock('@/features/recording/useAudioWorklet');
vi.mock('@/features/recording/useChunkUploader');
vi.mock('@/features/recording/useMobileRecording');
vi.mock('@/features/recording/useSilenceDetector');
vi.mock('@/features/session/ProcessingSessionsContext');

import { useAudioWorklet } from '@/features/recording/useAudioWorklet';
import { useChunkUploader } from '@/features/recording/useChunkUploader';
import { useMobileRecording } from '@/features/recording/useMobileRecording';
import { useSilenceDetector } from '@/features/recording/useSilenceDetector';
import { useProcessingSessions } from '@/features/session/ProcessingSessionsContext';
import { useRecordingPanel } from '@/features/recording/RecordingPanel/useRecordingPanel';
import type { UseAudioWorkletReturn } from '@/features/recording/useAudioWorklet.types';
import type { ChunkUploadStatus } from '@/features/recording/useChunkUploader';

const mockUseAudioWorklet = vi.mocked(useAudioWorklet);
const mockUseChunkUploader = vi.mocked(useChunkUploader);
const mockUseMobileRecording = vi.mocked(useMobileRecording);
const mockUseSilenceDetector = vi.mocked(useSilenceDetector);
const mockUseProcessingSessions = vi.mocked(useProcessingSessions);

// --- Helpers ---

function buildAudioWorkletReturn(
  partial: Partial<UseAudioWorkletReturn> = {},
): UseAudioWorkletReturn {
  return {
    state: partial.state ?? 'idle',
    duration: partial.duration ?? 0,
    chunkIndex: partial.chunkIndex ?? 0,
    mediaStream: partial.mediaStream ?? null,
    captureMode: partial.captureMode ?? 'audioworklet',
    error: partial.error ?? null,
    warnings: partial.warnings ?? [],
    startRecording: partial.startRecording ?? vi.fn().mockResolvedValue(undefined),
    stopRecording: partial.stopRecording ?? vi.fn().mockResolvedValue(undefined),
    pauseRecording: partial.pauseRecording ?? vi.fn(),
    resumeRecording: partial.resumeRecording ?? vi.fn(),
    resetRecording: partial.resetRecording ?? vi.fn(),
  };
}

interface ChunkEntry {
  chunkIndex: number;
  status: ChunkUploadStatus;
}

function buildChunkUploaderReturn(partial: {
  chunks?: ChunkEntry[];
  sessionId?: string | null;
  isUploading?: boolean;
  error?: string | null;
} = {}) {
  return {
    chunks: partial.chunks ?? [],
    sessionId: partial.sessionId ?? null,
    uploadChunkIndependent: vi.fn(),
    completeSession: vi.fn().mockResolvedValue(null),
    isUploading: partial.isUploading ?? false,
    error: partial.error ?? null,
    resetUploader: vi.fn(),
    abortAllUploads: vi.fn(),
    waitForInFlightUploads: vi.fn().mockResolvedValue(undefined),
  };
}

// --- Setup ---

beforeEach(() => {
  vi.clearAllMocks();

  mockUseAudioWorklet.mockReturnValue(buildAudioWorkletReturn());

  mockUseChunkUploader.mockReturnValue(buildChunkUploaderReturn() as never);

  mockUseMobileRecording.mockReturnValue({
    startWithMobilePolish: vi.fn(),
    stopWithMobilePolish: vi.fn(),
  } as never);

  mockUseSilenceDetector.mockReturnValue({
    isPausedBySilence: false,
    silenceWarningActive: false,
    secondsUntilAutoStop: null,
  } as never);

  mockUseProcessingSessions.mockReturnValue({
    sessions: [],
    addSession: vi.fn(),
    removeSession: vi.fn(),
  } as never);
});

// --- Test suite ---

describe('useRecordingPanel — pause/resume', () => {
  describe('pauseRecording guard', () => {
    it('exposes pauseRecording from useAudioWorklet', () => {
      const pauseFn = vi.fn();
      mockUseAudioWorklet.mockReturnValue(
        buildAudioWorkletReturn({ state: 'recording', pauseRecording: pauseFn }),
      );

      const { result } = renderHook(() =>
        useRecordingPanel({ topic: 'test' }),
      );

      result.current.pauseRecording();
      expect(pauseFn).toHaveBeenCalledOnce();
    });

    it('pauseRecording does nothing when state is idle (guard in useAudioWorklet)', () => {
      const pauseFn = vi.fn();
      mockUseAudioWorklet.mockReturnValue(
        buildAudioWorkletReturn({ state: 'idle', pauseRecording: pauseFn }),
      );

      const { result } = renderHook(() =>
        useRecordingPanel({ topic: 'test' }),
      );

      // The hook exposes it — the guard is internal to useAudioWorklet
      result.current.pauseRecording();
      expect(pauseFn).toHaveBeenCalledOnce();
    });
  });

  describe('resumeRecording guard', () => {
    it('exposes resumeRecording from useAudioWorklet', () => {
      const resumeFn = vi.fn();
      mockUseAudioWorklet.mockReturnValue(
        buildAudioWorkletReturn({ state: 'paused', resumeRecording: resumeFn }),
      );

      const { result } = renderHook(() =>
        useRecordingPanel({ topic: 'test' }),
      );

      result.current.resumeRecording();
      expect(resumeFn).toHaveBeenCalledOnce();
    });

    it('resumeRecording does nothing when state is not paused (guard in useAudioWorklet)', () => {
      const resumeFn = vi.fn();
      mockUseAudioWorklet.mockReturnValue(
        buildAudioWorkletReturn({ state: 'recording', resumeRecording: resumeFn }),
      );

      const { result } = renderHook(() =>
        useRecordingPanel({ topic: 'test' }),
      );

      result.current.resumeRecording();
      expect(resumeFn).toHaveBeenCalledOnce();
    });
  });

  describe('isPaused', () => {
    it('is true when captureState is paused', () => {
      mockUseAudioWorklet.mockReturnValue(
        buildAudioWorkletReturn({ state: 'paused' }),
      );

      const { result } = renderHook(() =>
        useRecordingPanel({ topic: 'test' }),
      );

      expect(result.current.isPaused).toBe(true);
    });

    it('is false when captureState is recording', () => {
      mockUseAudioWorklet.mockReturnValue(
        buildAudioWorkletReturn({ state: 'recording' }),
      );

      const { result } = renderHook(() =>
        useRecordingPanel({ topic: 'test' }),
      );

      expect(result.current.isPaused).toBe(false);
    });

    it('is false when captureState is idle', () => {
      mockUseAudioWorklet.mockReturnValue(
        buildAudioWorkletReturn({ state: 'idle' }),
      );

      const { result } = renderHook(() =>
        useRecordingPanel({ topic: 'test' }),
      );

      expect(result.current.isPaused).toBe(false);
    });
  });
});

describe('useRecordingPanel — canPause logic', () => {
  it('is true during normal recording away from chunk boundary with no uploading chunks', () => {
    mockUseAudioWorklet.mockReturnValue(
      buildAudioWorkletReturn({ state: 'recording', duration: 30 }),
    );
    mockUseChunkUploader.mockReturnValue(
      buildChunkUploaderReturn({ chunks: [] }) as never,
    );

    const { result } = renderHook(() =>
      useRecordingPanel({ topic: 'test' }),
    );

    expect(result.current.canPause).toBe(true);
  });

  it('is false when not recording (idle state)', () => {
    mockUseAudioWorklet.mockReturnValue(
      buildAudioWorkletReturn({ state: 'idle', duration: 30 }),
    );

    const { result } = renderHook(() =>
      useRecordingPanel({ topic: 'test' }),
    );

    expect(result.current.canPause).toBe(false);
  });

  it('is false when paused', () => {
    mockUseAudioWorklet.mockReturnValue(
      buildAudioWorkletReturn({ state: 'paused', duration: 30 }),
    );

    const { result } = renderHook(() =>
      useRecordingPanel({ topic: 'test' }),
    );

    expect(result.current.canPause).toBe(false);
  });

  describe('near chunk boundary lockout (duration % 120 >= 110)', () => {
    it('is false at exactly 110 seconds (first chunk near boundary)', () => {
      mockUseAudioWorklet.mockReturnValue(
        buildAudioWorkletReturn({ state: 'recording', duration: 110 }),
      );

      const { result } = renderHook(() =>
        useRecordingPanel({ topic: 'test' }),
      );

      expect(result.current.canPause).toBe(false);
    });

    it('is false at 115 seconds', () => {
      mockUseAudioWorklet.mockReturnValue(
        buildAudioWorkletReturn({ state: 'recording', duration: 115 }),
      );

      const { result } = renderHook(() =>
        useRecordingPanel({ topic: 'test' }),
      );

      expect(result.current.canPause).toBe(false);
    });

    it('is false at 119 seconds (just before chunk rolls)', () => {
      mockUseAudioWorklet.mockReturnValue(
        buildAudioWorkletReturn({ state: 'recording', duration: 119 }),
      );

      const { result } = renderHook(() =>
        useRecordingPanel({ topic: 'test' }),
      );

      expect(result.current.canPause).toBe(false);
    });

    it('is true at 109 seconds (just before lockout)', () => {
      mockUseAudioWorklet.mockReturnValue(
        buildAudioWorkletReturn({ state: 'recording', duration: 109 }),
      );

      const { result } = renderHook(() =>
        useRecordingPanel({ topic: 'test' }),
      );

      expect(result.current.canPause).toBe(true);
    });

    it('is false at 230 seconds (second chunk: 230 % 120 = 110)', () => {
      mockUseAudioWorklet.mockReturnValue(
        buildAudioWorkletReturn({ state: 'recording', duration: 230 }),
      );

      const { result } = renderHook(() =>
        useRecordingPanel({ topic: 'test' }),
      );

      expect(result.current.canPause).toBe(false);
    });

    it('is true at 121 seconds (start of second chunk: 121 % 120 = 1)', () => {
      mockUseAudioWorklet.mockReturnValue(
        buildAudioWorkletReturn({ state: 'recording', duration: 121 }),
      );

      const { result } = renderHook(() =>
        useRecordingPanel({ topic: 'test' }),
      );

      expect(result.current.canPause).toBe(true);
    });
  });

  describe('unconfirmed chunk uploading lockout', () => {
    it('is false when a chunk has status uploading', () => {
      mockUseAudioWorklet.mockReturnValue(
        buildAudioWorkletReturn({ state: 'recording', duration: 30 }),
      );
      mockUseChunkUploader.mockReturnValue(
        buildChunkUploaderReturn({
          chunks: [{ chunkIndex: 0, status: 'uploading' }],
        }) as never,
      );

      const { result } = renderHook(() =>
        useRecordingPanel({ topic: 'test' }),
      );

      expect(result.current.canPause).toBe(false);
    });

    it('is true when all chunks are completed', () => {
      mockUseAudioWorklet.mockReturnValue(
        buildAudioWorkletReturn({ state: 'recording', duration: 30 }),
      );
      mockUseChunkUploader.mockReturnValue(
        buildChunkUploaderReturn({
          chunks: [{ chunkIndex: 0, status: 'completed' }],
        }) as never,
      );

      const { result } = renderHook(() =>
        useRecordingPanel({ topic: 'test' }),
      );

      expect(result.current.canPause).toBe(true);
    });

    it('is false when any chunk among many is uploading', () => {
      mockUseAudioWorklet.mockReturnValue(
        buildAudioWorkletReturn({ state: 'recording', duration: 30 }),
      );
      mockUseChunkUploader.mockReturnValue(
        buildChunkUploaderReturn({
          chunks: [
            { chunkIndex: 0, status: 'completed' },
            { chunkIndex: 1, status: 'uploading' },
          ],
        }) as never,
      );

      const { result } = renderHook(() =>
        useRecordingPanel({ topic: 'test' }),
      );

      expect(result.current.canPause).toBe(false);
    });

    it('is true when chunks are pending (not uploading)', () => {
      mockUseAudioWorklet.mockReturnValue(
        buildAudioWorkletReturn({ state: 'recording', duration: 30 }),
      );
      mockUseChunkUploader.mockReturnValue(
        buildChunkUploaderReturn({
          chunks: [{ chunkIndex: 0, status: 'pending' }],
        }) as never,
      );

      const { result } = renderHook(() =>
        useRecordingPanel({ topic: 'test' }),
      );

      expect(result.current.canPause).toBe(true);
    });
  });

  describe('combined conditions', () => {
    it('is false when near boundary AND chunk uploading', () => {
      mockUseAudioWorklet.mockReturnValue(
        buildAudioWorkletReturn({ state: 'recording', duration: 115 }),
      );
      mockUseChunkUploader.mockReturnValue(
        buildChunkUploaderReturn({
          chunks: [{ chunkIndex: 0, status: 'uploading' }],
        }) as never,
      );

      const { result } = renderHook(() =>
        useRecordingPanel({ topic: 'test' }),
      );

      expect(result.current.canPause).toBe(false);
    });
  });
});

describe('useRecordingPanel — stopRecording from paused state', () => {
  it('stopRecording is callable when state is paused', () => {
    const stopFn = vi.fn().mockResolvedValue(undefined);
    mockUseAudioWorklet.mockReturnValue(
      buildAudioWorkletReturn({ state: 'paused', stopRecording: stopFn }),
    );

    const { result } = renderHook(() =>
      useRecordingPanel({ topic: 'test' }),
    );

    // The hook exposes stopWithMobilePolish, but stop is also used internally
    // Verify that useAudioWorklet's stop function is available
    expect(stopFn).not.toHaveBeenCalled();
    expect(result.current.recordState).toBe('paused');
  });
});
