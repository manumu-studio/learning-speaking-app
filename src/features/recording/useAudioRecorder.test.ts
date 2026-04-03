// Tests for useAudioRecorder — MediaRecorder state machine with mocked APIs
/** @vitest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAudioRecorder } from './useAudioRecorder';

class MockMediaRecorder {
  static isTypeSupported = vi.fn(() => true);
  mimeType: string;
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
    this.ondataavailable?.({ data: new Blob(['chunk'], { type: this.mimeType }) });
  });

  stop = vi.fn(() => {
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
