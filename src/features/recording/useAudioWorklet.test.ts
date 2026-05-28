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
} from '@/lib/audio/audioContextCompat';

describe('useAudioWorklet', () => {
  beforeEach(() => {
    vi.mocked(detectAudioCaptureMode).mockReturnValue('unsupported');
    vi.mocked(getInitialCompatState).mockReturnValue({ mode: 'unsupported', warnings: [] });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

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
});
