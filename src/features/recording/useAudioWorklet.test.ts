// Tests for useAudioWorklet — state machine behavior with mocked browser APIs
/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { useAudioWorklet } from './useAudioWorklet';

vi.mock('@/lib/audio/audioContextCompat', () => ({
  detectAudioCaptureMode: vi.fn(() => 'unsupported'),
  getInitialCompatState: vi.fn(() => ({ warnings: [] })),
  createAudioContext: vi.fn(),
  resumeAudioContext: vi.fn(),
  connectScriptProcessorCapture: vi.fn(),
  attachVisibilityWarning: vi.fn(() => () => undefined),
  attachTrackMuteHandlers: vi.fn(() => () => undefined),
}));

import {
  detectAudioCaptureMode,
  getInitialCompatState,
  createAudioContext,
  resumeAudioContext,
} from '@/lib/audio/audioContextCompat';

// ---------------------------------------------------------------------------
// Shared mock factories
// ---------------------------------------------------------------------------

function makeMockTrack() {
  return { stop: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() };
}

function makeMockStream(tracks = [makeMockTrack()]) {
  return {
    getTracks: () => tracks,
    getAudioTracks: () => tracks,
  };
}

function makeMockWorkletPort() {
  return { onmessage: null as ((ev: MessageEvent) => void) | null, postMessage: vi.fn() };
}

function makeMockWorkletNode(port = makeMockWorkletPort()) {
  return {
    port,
    connect: vi.fn(),
    disconnect: vi.fn(),
    onmessage: null,
  };
}

function makeMockAudioContext(workletNode = makeMockWorkletNode()) {
  return {
    state: 'running' as AudioContextState,
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    destination: {},
    createMediaStreamSource: vi.fn(() => ({ connect: vi.fn(), disconnect: vi.fn() })),
    audioWorklet: {
      addModule: vi.fn().mockResolvedValue(undefined),
    },
    _workletNode: workletNode,
  };
}

interface MockWorker {
  postMessage: ReturnType<typeof vi.fn>;
  terminate: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  onmessage: ((ev: MessageEvent) => void) | null;
  onerror: ((ev: ErrorEvent) => void) | null;
}

function makeMockWorker(): MockWorker {
  return {
    postMessage: vi.fn(),
    terminate: vi.fn(),
    addEventListener: vi.fn(),
    onmessage: null,
    onerror: null,
  };
}

// ---------------------------------------------------------------------------

describe('useAudioWorklet', () => {
  beforeEach(() => {
    vi.mocked(detectAudioCaptureMode).mockReturnValue('unsupported');
    vi.mocked(getInitialCompatState).mockReturnValue({ mode: 'unsupported', warnings: [] });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // Existing tests (kept intact)
  // -------------------------------------------------------------------------

  it('returns idle state and correct defaults on initial render', () => {
    const { result } = renderHook(() => useAudioWorklet());

    expect(result.current.state).toBe('idle');
    expect(result.current.duration).toBe(0);
    expect(result.current.chunkIndex).toBe(0);
    expect(result.current.mediaStream).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.warnings).toEqual([]);
  });

  it('returns captureMode "unsupported" when AudioContext is not available', () => {
    vi.mocked(detectAudioCaptureMode).mockReturnValue('unsupported');

    const { result } = renderHook(() => useAudioWorklet());

    expect(result.current.captureMode).toBe('unsupported');
  });

  it('startRecording sets error and transitions to error state when captureMode is unsupported', async () => {
    vi.mocked(detectAudioCaptureMode).mockReturnValue('unsupported');

    const { result } = renderHook(() => useAudioWorklet());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.state).toBe('error');
    expect(result.current.error).toContain('does not support');
  });

  it('resetRecording clears error and returns state to idle', async () => {
    vi.mocked(detectAudioCaptureMode).mockReturnValue('unsupported');

    const { result } = renderHook(() => useAudioWorklet());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.state).toBe('error');
    expect(result.current.error).not.toBeNull();

    act(() => {
      result.current.resetRecording();
    });

    expect(result.current.state).toBe('idle');
    expect(result.current.error).toBeNull();
    expect(result.current.duration).toBe(0);
    expect(result.current.chunkIndex).toBe(0);
  });

  // -------------------------------------------------------------------------
  // New tests: audioworklet mode — startRecording state transitions
  // -------------------------------------------------------------------------

  describe('startRecording with audioworklet mode', () => {
    let mockWorker: MockWorker;
    let mockStream: ReturnType<typeof makeMockStream>;
    let mockContext: ReturnType<typeof makeMockAudioContext>;

    beforeEach(() => {
      vi.mocked(detectAudioCaptureMode).mockReturnValue('audioworklet');
      vi.mocked(getInitialCompatState).mockReturnValue({ mode: 'audioworklet', warnings: [] });

      mockStream = makeMockStream();
      mockWorker = makeMockWorker();
      mockContext = makeMockAudioContext();

      // Mock AudioWorkletNode constructor to use our controlled node
      const workletNode = mockContext._workletNode;
      global.AudioWorkletNode = vi.fn(() => workletNode) as never;

      // getUserMedia
      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: { getUserMedia: vi.fn().mockResolvedValue(mockStream) },
        configurable: true,
      });

      // createAudioContext / resumeAudioContext
      vi.mocked(createAudioContext).mockResolvedValue(mockContext as unknown as AudioContext);
      vi.mocked(resumeAudioContext).mockResolvedValue(undefined);

      // Worker
      global.Worker = vi.fn(() => mockWorker) as never;
    });

    it('transitions state to "recording" after successful start', async () => {
      const { result } = renderHook(() => useAudioWorklet());

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.state).toBe('recording');
      expect(result.current.error).toBeNull();
    });

    it('exposes the media stream after successful start', async () => {
      const { result } = renderHook(() => useAudioWorklet());

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.mediaStream).toBe(mockStream);
    });

    it('calls AudioWorklet addModule to load the PCM collector worklet', async () => {
      const { result } = renderHook(() => useAudioWorklet());

      await act(async () => {
        await result.current.startRecording();
      });

      expect(mockContext.audioWorklet.addModule).toHaveBeenCalledWith(
        '/worklets/pcm-collector.worklet.js',
      );
    });

    it('resets duration and chunkIndex to 0 on each new startRecording call', async () => {
      const { result } = renderHook(() => useAudioWorklet());

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.duration).toBe(0);
      expect(result.current.chunkIndex).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // New test: stopRecording when not recording is a no-op
  // -------------------------------------------------------------------------

  it('stopRecording when state is idle remains idle', async () => {
    const { result } = renderHook(() => useAudioWorklet());

    expect(result.current.state).toBe('idle');

    await act(async () => {
      await result.current.stopRecording();
    });

    expect(result.current.state).toBe('idle');
  });

  it('stopRecording when state is error remains unchanged', async () => {
    vi.mocked(detectAudioCaptureMode).mockReturnValue('unsupported');

    const { result } = renderHook(() => useAudioWorklet());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.state).toBe('error');

    await act(async () => {
      await result.current.stopRecording();
    });

    expect(result.current.state).toBe('error');
  });

  // -------------------------------------------------------------------------
  // New test: duration timer increments each second
  // -------------------------------------------------------------------------

  describe('duration timer', () => {
    let mockWorker: MockWorker;
    let mockStream: ReturnType<typeof makeMockStream>;
    let mockContext: ReturnType<typeof makeMockAudioContext>;

    beforeEach(() => {
      vi.useFakeTimers();
      vi.mocked(detectAudioCaptureMode).mockReturnValue('audioworklet');
      vi.mocked(getInitialCompatState).mockReturnValue({ mode: 'audioworklet', warnings: [] });

      mockStream = makeMockStream();
      mockWorker = makeMockWorker();
      mockContext = makeMockAudioContext();

      const workletNode = mockContext._workletNode;
      global.AudioWorkletNode = vi.fn(() => workletNode) as never;

      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: { getUserMedia: vi.fn().mockResolvedValue(mockStream) },
        configurable: true,
      });

      vi.mocked(createAudioContext).mockResolvedValue(mockContext as unknown as AudioContext);
      vi.mocked(resumeAudioContext).mockResolvedValue(undefined);

      global.Worker = vi.fn(() => mockWorker) as never;
    });

    it('increments duration by 1 for each second elapsed during recording', async () => {
      const { result } = renderHook(() => useAudioWorklet());

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.duration).toBe(0);

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(result.current.duration).toBe(3);
    });

    it('duration does not advance after stopRecording is called', async () => {
      const { result } = renderHook(() => useAudioWorklet());

      await act(async () => {
        await result.current.startRecording();
      });

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(result.current.duration).toBe(2);

      await act(async () => {
        await result.current.stopRecording();
      });

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      // Timer should have been cleared — duration stays at 2
      expect(result.current.duration).toBe(2);
    });
  });

  // -------------------------------------------------------------------------
  // New test: onChunkReady callback — simulate Worker posting chunk-ready
  // -------------------------------------------------------------------------

  describe('onChunkReady callback', () => {
    let mockWorker: MockWorker;
    let mockStream: ReturnType<typeof makeMockStream>;
    let mockContext: ReturnType<typeof makeMockAudioContext>;

    beforeEach(() => {
      vi.mocked(detectAudioCaptureMode).mockReturnValue('audioworklet');
      vi.mocked(getInitialCompatState).mockReturnValue({ mode: 'audioworklet', warnings: [] });

      mockStream = makeMockStream();
      mockWorker = makeMockWorker();
      mockContext = makeMockAudioContext();

      const workletNode = mockContext._workletNode;
      global.AudioWorkletNode = vi.fn(() => workletNode) as never;

      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: { getUserMedia: vi.fn().mockResolvedValue(mockStream) },
        configurable: true,
      });

      vi.mocked(createAudioContext).mockResolvedValue(mockContext as unknown as AudioContext);
      vi.mocked(resumeAudioContext).mockResolvedValue(undefined);

      global.Worker = vi.fn(() => mockWorker) as never;
    });

    it('calls onChunkReady with a wav Blob when worker emits chunk-ready', async () => {
      const onChunkReady = vi.fn();
      const { result } = renderHook(() => useAudioWorklet({ onChunkReady }));

      await act(async () => {
        await result.current.startRecording();
      });

      const wavBuffer = new ArrayBuffer(128);
      const chunkMessage = {
        type: 'chunk-ready' as const,
        chunkIndex: 0,
        wavBuffer,
        durationSecs: 2.5,
        sampleCount: 40_000,
        isFinal: false,
      };

      act(() => {
        if (mockWorker.onmessage) {
          mockWorker.onmessage(new MessageEvent('message', { data: chunkMessage }));
        }
      });

      expect(onChunkReady).toHaveBeenCalledOnce();
      const callArg = onChunkReady.mock.calls[0]?.[0] as {
        chunkIndex: number;
        wavBlob: Blob;
        durationSecs: number;
        isFinal: boolean;
      };
      expect(callArg.chunkIndex).toBe(0);
      expect(callArg.wavBlob).toBeInstanceOf(Blob);
      expect(callArg.durationSecs).toBe(2.5);
      expect(callArg.isFinal).toBe(false);
    });

    it('increments chunkIndex after receiving a chunk-ready message', async () => {
      const { result } = renderHook(() => useAudioWorklet());

      await act(async () => {
        await result.current.startRecording();
      });

      const chunkMessage = {
        type: 'chunk-ready' as const,
        chunkIndex: 0,
        wavBuffer: new ArrayBuffer(64),
        durationSecs: 2,
        sampleCount: 32_000,
        isFinal: false,
      };

      act(() => {
        if (mockWorker.onmessage) {
          mockWorker.onmessage(new MessageEvent('message', { data: chunkMessage }));
        }
      });

      expect(result.current.chunkIndex).toBe(1);
    });

    it('transitions to "stopped" when worker emits a final chunk', async () => {
      const { result } = renderHook(() => useAudioWorklet());

      await act(async () => {
        await result.current.startRecording();
      });

      const finalChunkMessage = {
        type: 'chunk-ready' as const,
        chunkIndex: 0,
        wavBuffer: new ArrayBuffer(64),
        durationSecs: 2,
        sampleCount: 32_000,
        isFinal: true,
      };

      act(() => {
        if (mockWorker.onmessage) {
          mockWorker.onmessage(new MessageEvent('message', { data: finalChunkMessage }));
        }
      });

      expect(result.current.state).toBe('stopped');
    });
  });

  // -------------------------------------------------------------------------
  // New test: onError callback — simulate Worker posting an error message
  // -------------------------------------------------------------------------

  describe('onError callback', () => {
    let mockWorker: MockWorker;
    let mockStream: ReturnType<typeof makeMockStream>;
    let mockContext: ReturnType<typeof makeMockAudioContext>;

    beforeEach(() => {
      vi.mocked(detectAudioCaptureMode).mockReturnValue('audioworklet');
      vi.mocked(getInitialCompatState).mockReturnValue({ mode: 'audioworklet', warnings: [] });

      mockStream = makeMockStream();
      mockWorker = makeMockWorker();
      mockContext = makeMockAudioContext();

      const workletNode = mockContext._workletNode;
      global.AudioWorkletNode = vi.fn(() => workletNode) as never;

      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: { getUserMedia: vi.fn().mockResolvedValue(mockStream) },
        configurable: true,
      });

      vi.mocked(createAudioContext).mockResolvedValue(mockContext as unknown as AudioContext);
      vi.mocked(resumeAudioContext).mockResolvedValue(undefined);

      global.Worker = vi.fn(() => mockWorker) as never;
    });

    it('calls onError and transitions to error state when worker posts an error message', async () => {
      const onError = vi.fn();
      const { result } = renderHook(() => useAudioWorklet({ onError }));

      await act(async () => {
        await result.current.startRecording();
      });

      const errorMessage = {
        type: 'error' as const,
        message: 'WAV encoding failed',
      };

      act(() => {
        if (mockWorker.onmessage) {
          mockWorker.onmessage(new MessageEvent('message', { data: errorMessage }));
        }
      });

      expect(result.current.state).toBe('error');
      expect(result.current.error).toBe('WAV encoding failed');
      expect(onError).toHaveBeenCalledWith('WAV encoding failed');
    });

    it('transitions to error state when worker fires onerror', async () => {
      const onError = vi.fn();
      const { result } = renderHook(() => useAudioWorklet({ onError }));

      await act(async () => {
        await result.current.startRecording();
      });

      act(() => {
        if (mockWorker.onerror) {
          mockWorker.onerror(new ErrorEvent('error'));
        }
      });

      expect(result.current.state).toBe('error');
      expect(result.current.error).toBe('Chunk worker failed unexpectedly');
      expect(onError).toHaveBeenCalledWith('Chunk worker failed unexpectedly');
    });
  });

  // -------------------------------------------------------------------------
  // New test: cleanup on unmount — media stream tracks are stopped
  // -------------------------------------------------------------------------

  describe('cleanup on unmount', () => {
    let mockWorker: MockWorker;
    let mockTrack: ReturnType<typeof makeMockTrack>;
    let mockStream: ReturnType<typeof makeMockStream>;
    let mockContext: ReturnType<typeof makeMockAudioContext>;

    beforeEach(() => {
      vi.mocked(detectAudioCaptureMode).mockReturnValue('audioworklet');
      vi.mocked(getInitialCompatState).mockReturnValue({ mode: 'audioworklet', warnings: [] });

      mockTrack = makeMockTrack();
      mockStream = makeMockStream([mockTrack]);
      mockWorker = makeMockWorker();
      mockContext = makeMockAudioContext();

      const workletNode = mockContext._workletNode;
      global.AudioWorkletNode = vi.fn(() => workletNode) as never;

      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: { getUserMedia: vi.fn().mockResolvedValue(mockStream) },
        configurable: true,
      });

      vi.mocked(createAudioContext).mockResolvedValue(mockContext as unknown as AudioContext);
      vi.mocked(resumeAudioContext).mockResolvedValue(undefined);

      global.Worker = vi.fn(() => mockWorker) as never;
    });

    it('stops all media stream tracks when the hook unmounts during recording', async () => {
      const { result, unmount } = renderHook(() => useAudioWorklet());

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.state).toBe('recording');

      act(() => {
        unmount();
      });

      expect(mockTrack.stop).toHaveBeenCalled();
    });

    it('terminates the chunk worker when the hook unmounts', async () => {
      const { result, unmount } = renderHook(() => useAudioWorklet());

      await act(async () => {
        await result.current.startRecording();
      });

      act(() => {
        unmount();
      });

      expect(mockWorker.terminate).toHaveBeenCalled();
    });

    it('closes the AudioContext when the hook unmounts', async () => {
      const { result, unmount } = renderHook(() => useAudioWorklet());

      await act(async () => {
        await result.current.startRecording();
      });

      act(() => {
        unmount();
      });

      expect(mockContext.close).toHaveBeenCalled();
    });
  });
});
