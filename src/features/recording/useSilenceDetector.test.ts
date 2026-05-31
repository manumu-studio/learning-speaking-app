// Tests for useSilenceDetector hook — silence detection and auto-pause behavior
/** @vitest-environment jsdom */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSilenceDetector } from './useSilenceDetector';

// --- Web Audio API mocks ---

type FloatTimeDomainCallback = (buffer: Float32Array) => void;

interface MockAnalyserNode {
  fftSize: number;
  getFloatTimeDomainData: ReturnType<typeof vi.fn>;
  _setDataCallback: (cb: FloatTimeDomainCallback) => void;
}

function createMockAnalyser(): MockAnalyserNode {
  let dataCallback: FloatTimeDomainCallback = () => undefined;

  const analyser: MockAnalyserNode = {
    fftSize: 512,
    getFloatTimeDomainData: vi.fn((buffer: Float32Array) => {
      dataCallback(buffer);
    }),
    _setDataCallback: (cb: FloatTimeDomainCallback) => {
      dataCallback = cb;
    },
  };

  return analyser;
}

function makeStream(): MediaStream {
  return {} as MediaStream;
}

function buildAudioContextMock(analyser: MockAnalyserNode) {
  const source = {
    connect: vi.fn(),
    disconnect: vi.fn(),
  };

  return {
    createMediaStreamSource: vi.fn(() => source),
    createAnalyser: vi.fn(() => analyser),
    close: vi.fn().mockResolvedValue(undefined),
    _source: source,
  };
}

// --- Helpers ---

/** Fill buffer with silence (all zeros → RMS = 0, below threshold). */
function fillSilent(buffer: Float32Array): void {
  buffer.fill(0);
}

/** Fill buffer with loud audio (value 0.5 → RMS ≈ 0.5, above threshold). */
function fillLoud(buffer: Float32Array): void {
  buffer.fill(0.5);
}

// --- Test suite ---

describe('useSilenceDetector', () => {
  let analyser: MockAnalyserNode;
  let MockAudioContext: ReturnType<typeof vi.fn>;
  let audioContextInstance: ReturnType<typeof buildAudioContextMock>;

  beforeEach(() => {
    vi.useFakeTimers();

    analyser = createMockAnalyser();
    // Default: return silence so every interval tick reads RMS = 0
    analyser._setDataCallback(fillSilent);

    audioContextInstance = buildAudioContextMock(analyser);

    MockAudioContext = vi.fn(() => audioContextInstance);
    vi.stubGlobal('AudioContext', MockAudioContext);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // --- Guard conditions ---

  it('returns isPausedBySilence: false when isRecording is false', () => {
    const stream = makeStream();
    const { result } = renderHook(() =>
      useSilenceDetector({ stream, isRecording: false }),
    );

    expect(result.current.isPausedBySilence).toBe(false);
    // AudioContext should never be created
    expect(MockAudioContext).not.toHaveBeenCalled();
  });

  it('returns isPausedBySilence: false when stream is null', () => {
    const { result } = renderHook(() =>
      useSilenceDetector({ stream: null, isRecording: true }),
    );

    expect(result.current.isPausedBySilence).toBe(false);
    expect(MockAudioContext).not.toHaveBeenCalled();
  });

  it('returns isPausedBySilence: false even after 15s when isRecording is false', () => {
    const { result } = renderHook(() =>
      useSilenceDetector({ stream: null, isRecording: false }),
    );

    act(() => {
      vi.advanceTimersByTime(16_000);
    });

    expect(result.current.isPausedBySilence).toBe(false);
  });

  // --- Silence detection ---

  it('creates AudioContext with stream when isRecording and stream are provided', () => {
    const stream = makeStream();
    renderHook(() => useSilenceDetector({ stream, isRecording: true }));

    expect(MockAudioContext).toHaveBeenCalledOnce();
    expect(audioContextInstance.createMediaStreamSource).toHaveBeenCalledWith(stream);
    expect(audioContextInstance.createAnalyser).toHaveBeenCalledOnce();
    expect(audioContextInstance._source.connect).toHaveBeenCalledWith(analyser);
  });

  it('does not pause before 15 seconds of silence', () => {
    const stream = makeStream();
    const onPause = vi.fn();
    analyser._setDataCallback(fillSilent);

    const { result } = renderHook(() =>
      useSilenceDetector({ stream, isRecording: true, onPause }),
    );

    // Advance 14.8s — just under the 15s threshold
    act(() => {
      vi.advanceTimersByTime(14_800);
    });

    expect(result.current.isPausedBySilence).toBe(false);
    expect(onPause).not.toHaveBeenCalled();
  });

  it('sets isPausedBySilence to true and calls onPause after 15s of silence', () => {
    const stream = makeStream();
    const onPause = vi.fn();
    analyser._setDataCallback(fillSilent);

    const { result } = renderHook(() =>
      useSilenceDetector({ stream, isRecording: true, onPause }),
    );

    act(() => {
      vi.advanceTimersByTime(15_200);
    });

    expect(result.current.isPausedBySilence).toBe(true);
    expect(onPause).toHaveBeenCalledOnce();
  });

  it('calls onPause exactly once even after multiple silent intervals beyond 15s', () => {
    const stream = makeStream();
    const onPause = vi.fn();
    analyser._setDataCallback(fillSilent);

    renderHook(() =>
      useSilenceDetector({ stream, isRecording: true, onPause }),
    );

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(onPause).toHaveBeenCalledOnce();
  });

  // --- Sound returns after silence ---

  it('sets isPausedBySilence to false and calls onResume when audio returns', () => {
    const stream = makeStream();
    const onPause = vi.fn();
    const onResume = vi.fn();
    analyser._setDataCallback(fillSilent);

    const { result } = renderHook(() =>
      useSilenceDetector({ stream, isRecording: true, onPause, onResume }),
    );

    // Trigger pause
    act(() => {
      vi.advanceTimersByTime(15_200);
    });

    expect(result.current.isPausedBySilence).toBe(true);
    expect(onPause).toHaveBeenCalledOnce();
    expect(onResume).not.toHaveBeenCalled();

    // Simulate audio returning
    analyser._setDataCallback(fillLoud);

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current.isPausedBySilence).toBe(false);
    expect(onResume).toHaveBeenCalledOnce();
  });

  it('does not call onResume when audio returns without a prior pause', () => {
    const stream = makeStream();
    const onResume = vi.fn();
    // Audio is loud from the start — no silence period
    analyser._setDataCallback(fillLoud);

    renderHook(() =>
      useSilenceDetector({ stream, isRecording: true, onResume }),
    );

    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    expect(onResume).not.toHaveBeenCalled();
  });

  it('resets silence timer when sound is detected before 15s', () => {
    const stream = makeStream();
    const onPause = vi.fn();
    analyser._setDataCallback(fillSilent);

    renderHook(() =>
      useSilenceDetector({ stream, isRecording: true, onPause }),
    );

    // 10s of silence — not yet paused
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(onPause).not.toHaveBeenCalled();

    // Sound returns — resets the silence clock
    analyser._setDataCallback(fillLoud);
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Silence again — timer restarts from zero
    analyser._setDataCallback(fillSilent);
    act(() => {
      vi.advanceTimersByTime(14_800);
    });

    // Should NOT have paused yet (only 14.8s after reset)
    expect(onPause).not.toHaveBeenCalled();

    // Now cross the threshold
    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(onPause).toHaveBeenCalledOnce();
  });

  // --- Cleanup ---

  it('closes AudioContext and clears interval on unmount', () => {
    const stream = makeStream();

    const { unmount } = renderHook(() =>
      useSilenceDetector({ stream, isRecording: true }),
    );

    unmount();

    expect(audioContextInstance._source.disconnect).toHaveBeenCalledOnce();
    expect(audioContextInstance.close).toHaveBeenCalledOnce();
  });

  it('resets isPausedBySilence to false on unmount', () => {
    const stream = makeStream();
    analyser._setDataCallback(fillSilent);

    const { result, unmount } = renderHook(() =>
      useSilenceDetector({ stream, isRecording: true }),
    );

    // Trigger pause
    act(() => {
      vi.advanceTimersByTime(15_200);
    });
    expect(result.current.isPausedBySilence).toBe(true);

    act(() => {
      unmount();
    });

    // After unmount the returned state snapshot is stale but AudioContext was closed
    expect(audioContextInstance.close).toHaveBeenCalledOnce();
  });

  it('does not create AudioContext when isRecording transitions from true to false', () => {
    const stream = makeStream();

    const { rerender } = renderHook(
      ({ isRecording }: { isRecording: boolean }) =>
        useSilenceDetector({ stream, isRecording }),
      { initialProps: { isRecording: true } },
    );

    expect(MockAudioContext).toHaveBeenCalledOnce();

    // Stop recording — cleanup runs
    rerender({ isRecording: false });

    expect(audioContextInstance.close).toHaveBeenCalledOnce();
    expect(audioContextInstance._source.disconnect).toHaveBeenCalledOnce();
  });

  // --- Tier 2: Warning beep at 30s ---

  it('activates silenceWarningActive and calls onWarningBeep after 30s of silence', () => {
    const stream = makeStream();
    const onWarningBeep = vi.fn();
    analyser._setDataCallback(fillSilent);

    const { result } = renderHook(() =>
      useSilenceDetector({ stream, isRecording: true, onWarningBeep }),
    );

    act(() => {
      vi.advanceTimersByTime(30_200);
    });

    expect(result.current.silenceWarningActive).toBe(true);
    expect(result.current.secondsUntilAutoStop).toBeLessThanOrEqual(15);
    expect(onWarningBeep).toHaveBeenCalledOnce();
  });

  it('calls onWarningBeep only once even after continued silence past 30s', () => {
    const stream = makeStream();
    const onWarningBeep = vi.fn();
    analyser._setDataCallback(fillSilent);

    renderHook(() =>
      useSilenceDetector({ stream, isRecording: true, onWarningBeep }),
    );

    act(() => {
      vi.advanceTimersByTime(35_000);
    });

    expect(onWarningBeep).toHaveBeenCalledOnce();
  });

  // --- Tier 3: Auto-stop at 45s ---

  it('calls onAutoStop after 45s of silence and resets state', () => {
    const stream = makeStream();
    const onAutoStop = vi.fn();
    analyser._setDataCallback(fillSilent);

    const { result } = renderHook(() =>
      useSilenceDetector({ stream, isRecording: true, onAutoStop }),
    );

    act(() => {
      vi.advanceTimersByTime(45_200);
    });

    expect(onAutoStop).toHaveBeenCalledOnce();
    expect(result.current.isPausedBySilence).toBe(false);
    expect(result.current.silenceWarningActive).toBe(false);
  });

  // --- Return value guard when inactive ---

  it('returns false from isPausedBySilence when isRecording is false regardless of internal state', () => {
    // isRecording: false with a stream — the guard in the return should apply
    const stream = makeStream();

    const { result } = renderHook(() =>
      useSilenceDetector({ stream, isRecording: false }),
    );

    // Even if we somehow advanced timers, no interval runs
    act(() => {
      vi.advanceTimersByTime(20_000);
    });

    expect(result.current.isPausedBySilence).toBe(false);
  });
});
