// Tests for useAudioRecorder — MediaRecorder state machine with mocked APIs
/** @vitest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAudioRecorder } from './useAudioRecorder';

class MockMediaRecorder {
  static isTypeSupported = vi.fn(() => true);
  mimeType: string;
  state: 'inactive' | 'recording' | 'paused' = 'inactive';
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(
    _stream: MediaStream,
    options?: { mimeType?: string },
  ) {
    this.mimeType = options?.mimeType ?? 'audio/webm';
  }

  start = vi.fn(() => {
    this.state = 'recording';
    this.ondataavailable?.({ data: new Blob(['chunk'], { type: this.mimeType }) });
  });

  stop = vi.fn(() => {
    this.state = 'inactive';
    this.onstop?.();
  });
}

describe('useAudioRecorder', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'MediaRecorder',
      MockMediaRecorder as unknown as typeof MediaRecorder,
    );
    const trackStop = vi.fn();
    const stream = {
      getTracks: () => [{ stop: trackStop }],
    } as unknown as MediaStream;
    vi.stubGlobal('navigator', {
      ...navigator,
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(stream),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('starts idle then moves to recording after startRecording resolves', async () => {
    const { result } = renderHook(() => useAudioRecorder());

    expect(result.current.state).toBe('idle');
    expect(result.current.error).toBeNull();

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.state).toBe('recording');
    expect(MockMediaRecorder.isTypeSupported).toHaveBeenCalled();
  });

  it('stopRecording produces blob and stopped state', async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    act(() => {
      result.current.stopRecording();
    });

    await waitFor(() => {
      expect(result.current.state).toBe('stopped');
    });

    expect(result.current.audioBlob).toBeInstanceOf(Blob);
    expect(result.current.audioBlob?.size).toBeGreaterThan(0);
  });

  it('sets error when getUserMedia rejects with NotAllowedError', async () => {
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(
      Object.assign(new Error('denied'), { name: 'NotAllowedError' }),
    );

    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.state).toBe('idle');
    expect(result.current.error).toContain('Microphone access denied');
  });

  it('resetRecording clears blob, duration, and error', async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });
    act(() => {
      result.current.stopRecording();
    });
    await waitFor(() => {
      expect(result.current.state).toBe('stopped');
    });

    act(() => {
      result.current.resetRecording();
    });

    expect(result.current.state).toBe('idle');
    expect(result.current.duration).toBe(0);
    expect(result.current.audioBlob).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('sets error when no MIME type is supported', async () => {
    MockMediaRecorder.isTypeSupported.mockReturnValue(false);

    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.state).toBe('idle');
    expect(result.current.error).toContain('No supported audio MIME type');
  });
});

describe('useAudioRecorder auto-segmentation', () => {
  let trackStop: ReturnType<typeof vi.fn>;
  let stream: MediaStream;
  let createdRecorders: MockMediaRecorder[];

  beforeEach(() => {
    vi.useFakeTimers();
    createdRecorders = [];
    trackStop = vi.fn();

    class SegmentedMockMediaRecorder extends MockMediaRecorder {
      constructor(recStream: MediaStream, options?: { mimeType?: string }) {
        super(recStream, options);
        createdRecorders.push(this);
      }
    }

    vi.stubGlobal(
      'MediaRecorder',
      SegmentedMockMediaRecorder as unknown as typeof MediaRecorder,
    );

    stream = {
      getTracks: () => [{ stop: trackStop }],
    } as unknown as MediaStream;

    vi.stubGlobal('navigator', {
      ...navigator,
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(stream),
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('should auto-stop at maxDurationSecs and call onSegmentReady', async () => {
    const onSegmentReady = vi.fn();
    const { result } = renderHook(() =>
      useAudioRecorder({ maxDurationSecs: 300, onSegmentReady })
    );

    await act(async () => {
      await result.current.startRecording();
    });

    await act(async () => {
      vi.advanceTimersByTime(300_000);
    });

    expect(onSegmentReady).toHaveBeenCalledTimes(1);
    expect(onSegmentReady.mock.calls[0]?.[2]).toBe(0);
    expect(result.current.segmentIndex).toBe(1);
    expect(trackStop).not.toHaveBeenCalled();
  });

  it('should restart recording on same stream after auto-segment', async () => {
    const onSegmentReady = vi.fn();
    const { result } = renderHook(() =>
      useAudioRecorder({ maxDurationSecs: 300, onSegmentReady })
    );

    await act(async () => {
      await result.current.startRecording();
    });

    const initialCount = createdRecorders.length;

    await act(async () => {
      vi.advanceTimersByTime(300_000);
    });

    expect(createdRecorders.length).toBeGreaterThan(initialCount);
    expect(result.current.state).toBe('recording');
    expect(trackStop).not.toHaveBeenCalled();
  });

  it('should NOT auto-segment when maxDurationSecs is null', async () => {
    const onSegmentReady = vi.fn();
    const { result } = renderHook(() =>
      useAudioRecorder({ maxDurationSecs: null, onSegmentReady })
    );

    await act(async () => {
      await result.current.startRecording();
    });

    await act(async () => {
      vi.advanceTimersByTime(400_000);
    });

    expect(onSegmentReady).not.toHaveBeenCalled();
    expect(result.current.state).toBe('recording');
  });

  it('should fire onWarning callback before split', async () => {
    const onWarning = vi.fn();
    const { result } = renderHook(() =>
      useAudioRecorder({ maxDurationSecs: 300, warningBeforeSplitSecs: 30, onWarning })
    );

    await act(async () => {
      await result.current.startRecording();
    });

    await act(async () => {
      vi.advanceTimersByTime(270_000);
    });

    expect(onWarning).toHaveBeenCalledWith(30);
    expect(result.current.secondsUntilSplit).toBe(30);
  });

  it('should stop stream on manual stopRecording', async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => useAudioRecorder({ maxDurationSecs: 300 }));

    await act(async () => {
      await result.current.startRecording();
    });

    act(() => {
      result.current.stopRecording();
    });

    await waitFor(() => {
      expect(result.current.state).toBe('stopped');
    });

    expect(trackStop).toHaveBeenCalled();
    vi.useFakeTimers();
  });

  it('should reset segmentIndex on resetRecording', async () => {
    const onSegmentReady = vi.fn();
    const { result } = renderHook(() =>
      useAudioRecorder({ maxDurationSecs: 300, onSegmentReady })
    );

    await act(async () => {
      await result.current.startRecording();
    });

    await act(async () => {
      vi.advanceTimersByTime(300_000);
    });

    act(() => {
      result.current.resetRecording();
    });

    expect(result.current.segmentIndex).toBe(0);
  });
});
