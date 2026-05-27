// Tests for useMobileRecording — haptics, wake lock, and interruption handling
/** @vitest-environment jsdom */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useMobileRecording } from './useMobileRecording';

describe('useMobileRecording', () => {
  const startRecording = vi.fn().mockResolvedValue(undefined);
  const stopRecording = vi.fn();
  const onInterrupted = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        ...globalThis.navigator,
        vibrate: vi.fn(),
        wakeLock: {
          request: vi.fn().mockResolvedValue({
            release: vi.fn().mockResolvedValue(undefined),
          }),
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('wraps start with wake lock and haptic pulse', async () => {
    const { result } = renderHook(() =>
      useMobileRecording({
        isRecording: false,
        mediaStream: null,
        startRecording,
        stopRecording,
        onInterrupted,
      }),
    );

    await act(async () => {
      await result.current.startWithMobilePolish();
    });

    expect(navigator.wakeLock.request).toHaveBeenCalledWith('screen');
    expect(navigator.vibrate).toHaveBeenCalledWith(50);
    expect(startRecording).toHaveBeenCalledOnce();
  });

  it('wraps stop with haptic pattern', () => {
    const { result } = renderHook(() =>
      useMobileRecording({
        isRecording: true,
        mediaStream: null,
        startRecording,
        stopRecording,
        onInterrupted,
      }),
    );

    act(() => {
      result.current.stopWithMobilePolish();
    });

    expect(stopRecording).toHaveBeenCalledOnce();
    expect(navigator.vibrate).toHaveBeenCalledWith([100, 50]);
  });

  it('reports interruption when an audio track ends', () => {
    const trackListeners: Record<string, () => void> = {};
    const track = {
      addEventListener: vi.fn((event: string, handler: () => void) => {
        trackListeners[event] = handler;
      }),
      removeEventListener: vi.fn(),
    };
    const mediaStream = {
      getAudioTracks: () => [track],
    } as unknown as MediaStream;

    renderHook(() =>
      useMobileRecording({
        isRecording: true,
        mediaStream,
        startRecording,
        stopRecording,
        onInterrupted,
      }),
    );

    act(() => {
      trackListeners.ended?.();
    });

    expect(stopRecording).toHaveBeenCalled();
    expect(onInterrupted).toHaveBeenCalledWith(
      expect.stringContaining('interrupted'),
    );
  });
});
