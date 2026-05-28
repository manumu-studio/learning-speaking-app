// Unit tests for audioContextCompat — browser compatibility helpers for audio capture
/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  attachTrackMuteHandlers,
  attachVisibilityWarning,
  connectScriptProcessorCapture,
  createAudioContext,
  detectAudioCaptureMode,
  getInitialCompatState,
  resumeAudioContext,
} from '@/lib/audio/audioContextCompat';

// ---------------------------------------------------------------------------
// Shared mock factory
// ---------------------------------------------------------------------------

function makeMockAudioContext(state: AudioContextState = 'running') {
  return {
    state,
    resume: vi.fn().mockResolvedValue(undefined),
    destination: {},
    createScriptProcessor: vi.fn().mockReturnValue({
      onaudioprocess: null as ((ev: AudioProcessingEvent) => void) | null,
      connect: vi.fn(),
      disconnect: vi.fn(),
    }),
  };
}

// ---------------------------------------------------------------------------
// detectAudioCaptureMode
// ---------------------------------------------------------------------------

describe('detectAudioCaptureMode', () => {
  beforeEach(() => {
    delete (globalThis as Record<string, unknown>).AudioWorkletNode;
    delete (globalThis as Record<string, unknown>).ScriptProcessorNode;
  });

  it('returns "audioworklet" when AudioWorkletNode is defined', () => {
    (globalThis as Record<string, unknown>).AudioWorkletNode = class {};
    expect(detectAudioCaptureMode()).toBe('audioworklet');
  });

  it('returns "scriptprocessor" when only ScriptProcessorNode is defined', () => {
    (globalThis as Record<string, unknown>).ScriptProcessorNode = class {};
    expect(detectAudioCaptureMode()).toBe('scriptprocessor');
  });

  it('returns "unsupported" when neither node type is available', () => {
    expect(detectAudioCaptureMode()).toBe('unsupported');
  });
});

// ---------------------------------------------------------------------------
// getInitialCompatState
// ---------------------------------------------------------------------------

describe('getInitialCompatState', () => {
  beforeEach(() => {
    delete (globalThis as Record<string, unknown>).AudioWorkletNode;
    delete (globalThis as Record<string, unknown>).ScriptProcessorNode;
  });

  it('returns mode "audioworklet" and no warnings on a modern browser', () => {
    (globalThis as Record<string, unknown>).AudioWorkletNode = class {};
    const result = getInitialCompatState();
    expect(result.mode).toBe('audioworklet');
    expect(result.warnings).toHaveLength(0);
  });

  it('returns mode "scriptprocessor" with a legacy warning on legacy browser', () => {
    (globalThis as Record<string, unknown>).ScriptProcessorNode = class {};
    const result = getInitialCompatState();
    expect(result.mode).toBe('scriptprocessor');
    expect(result.warnings[0]).toMatch(/legacy audio capture/i);
  });

  it('appends an iOS screen-on warning when navigator.userAgent matches iPhone', () => {
    (globalThis as Record<string, unknown>).AudioWorkletNode = class {};
    const originalUA = navigator.userAgent;
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',
      configurable: true,
    });

    const result = getInitialCompatState();
    expect(result.warnings.some((w) => /screen on/i.test(w))).toBe(true);

    Object.defineProperty(navigator, 'userAgent', {
      value: originalUA,
      configurable: true,
    });
  });
});

// ---------------------------------------------------------------------------
// createAudioContext
// ---------------------------------------------------------------------------

describe('createAudioContext', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('creates an AudioContext using window.AudioContext', async () => {
    const mockCtx = makeMockAudioContext();
    const MockCtor = vi.fn(() => mockCtx);

    Object.defineProperty(window, 'AudioContext', {
      value: MockCtor,
      writable: true,
      configurable: true,
    });

    const result = await createAudioContext(16000);
    expect(MockCtor).toHaveBeenCalledWith({ sampleRate: 16000 });
    expect(result).toBe(mockCtx);
  });

  it('falls back to webkitAudioContext when AudioContext is absent', async () => {
    const mockCtx = makeMockAudioContext();
    const MockWebkitCtor = vi.fn(() => mockCtx);

    Object.defineProperty(window, 'AudioContext', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, 'webkitAudioContext', {
      value: MockWebkitCtor,
      writable: true,
      configurable: true,
    });

    const result = await createAudioContext(16000);
    expect(MockWebkitCtor).toHaveBeenCalledWith({ sampleRate: 16000 });
    expect(result).toBe(mockCtx);
  });

  it('throws when neither AudioContext nor webkitAudioContext is available', async () => {
    Object.defineProperty(window, 'AudioContext', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, 'webkitAudioContext', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    await expect(createAudioContext(16000)).rejects.toThrow(
      'Web Audio API is not supported in this browser',
    );
  });
});

// ---------------------------------------------------------------------------
// resumeAudioContext
// ---------------------------------------------------------------------------

describe('resumeAudioContext', () => {
  it('calls resume() when context is suspended', async () => {
    const ctx = makeMockAudioContext('suspended');
    await resumeAudioContext(ctx as unknown as AudioContext);
    expect(ctx.resume).toHaveBeenCalledOnce();
  });

  it('does NOT call resume() when context is already running', async () => {
    const ctx = makeMockAudioContext('running');
    await resumeAudioContext(ctx as unknown as AudioContext);
    expect(ctx.resume).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// attachVisibilityWarning
// ---------------------------------------------------------------------------

describe('attachVisibilityWarning', () => {
  it('calls onWarning when tab becomes hidden and context is suspended', () => {
    const ctx = makeMockAudioContext('suspended');
    const onWarning = vi.fn();

    attachVisibilityWarning(ctx as unknown as AudioContext, onWarning);

    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(onWarning).toHaveBeenCalledWith(
      expect.stringMatching(/Recording paused/i),
    );
  });

  it('does NOT call onWarning when tab is hidden but context is running', () => {
    const ctx = makeMockAudioContext('running');
    const onWarning = vi.fn();

    attachVisibilityWarning(ctx as unknown as AudioContext, onWarning);

    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(onWarning).not.toHaveBeenCalled();
  });

  it('returns a cleanup function that removes the event listener', () => {
    const ctx = makeMockAudioContext('suspended');
    const onWarning = vi.fn();

    const cleanup = attachVisibilityWarning(ctx as unknown as AudioContext, onWarning);
    cleanup();

    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(onWarning).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// attachTrackMuteHandlers
// ---------------------------------------------------------------------------

function makeMockTrack() {
  const listeners: Record<string, EventListenerOrEventListenerObject[]> = {};
  return {
    addEventListener: vi.fn((type: string, handler: EventListenerOrEventListenerObject) => {
      listeners[type] = listeners[type] ?? [];
      listeners[type].push(handler);
    }),
    removeEventListener: vi.fn((type: string, handler: EventListenerOrEventListenerObject) => {
      listeners[type] = (listeners[type] ?? []).filter((h) => h !== handler);
    }),
    dispatch: (type: string) => {
      for (const handler of listeners[type] ?? []) {
        if (typeof handler === 'function') handler(new Event(type));
        else handler.handleEvent(new Event(type));
      }
    },
  };
}

describe('attachTrackMuteHandlers', () => {
  it('calls onWarning with mute message when track fires mute event', () => {
    const track = makeMockTrack();
    const stream = {
      getAudioTracks: vi.fn(() => [track]),
    } as unknown as MediaStream;
    const onWarning = vi.fn();

    attachTrackMuteHandlers(stream, onWarning);
    track.dispatch('mute');

    expect(onWarning).toHaveBeenCalledWith(expect.stringMatching(/Microphone muted/i));
  });

  it('calls onWarning with restore message when track fires unmute event', () => {
    const track = makeMockTrack();
    const stream = {
      getAudioTracks: vi.fn(() => [track]),
    } as unknown as MediaStream;
    const onWarning = vi.fn();

    attachTrackMuteHandlers(stream, onWarning);
    track.dispatch('unmute');

    expect(onWarning).toHaveBeenCalledWith(expect.stringMatching(/Microphone restored/i));
  });

  it('returns a cleanup function that removes both event listeners', () => {
    const track = makeMockTrack();
    const stream = {
      getAudioTracks: vi.fn(() => [track]),
    } as unknown as MediaStream;
    const onWarning = vi.fn();

    const cleanup = attachTrackMuteHandlers(stream, onWarning);
    cleanup();

    expect(track.removeEventListener).toHaveBeenCalledTimes(2);
    // Firing after cleanup should not trigger warning
    track.dispatch('mute');
    expect(onWarning).not.toHaveBeenCalled();
  });

  it('handles a stream with no audio tracks gracefully', () => {
    const stream = {
      getAudioTracks: vi.fn(() => []),
    } as unknown as MediaStream;
    const onWarning = vi.fn();

    const cleanup = attachTrackMuteHandlers(stream, onWarning);
    expect(() => cleanup()).not.toThrow();
    expect(onWarning).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// connectScriptProcessorCapture
// ---------------------------------------------------------------------------

describe('connectScriptProcessorCapture', () => {
  it('wires source → processor → destination and returns the processor', () => {
    const processor = {
      onaudioprocess: null as ((ev: AudioProcessingEvent) => void) | null,
      connect: vi.fn(),
    };
    const ctx = {
      state: 'running' as AudioContextState,
      resume: vi.fn(),
      destination: {},
      createScriptProcessor: vi.fn(() => processor),
    };
    const source = { connect: vi.fn() };
    const onPcm = vi.fn();

    const result = connectScriptProcessorCapture(
      ctx as unknown as AudioContext,
      source as unknown as MediaStreamAudioSourceNode,
      onPcm,
    );

    expect(ctx.createScriptProcessor).toHaveBeenCalledWith(4096, 1, 1);
    expect(source.connect).toHaveBeenCalledWith(processor);
    expect(processor.connect).toHaveBeenCalledWith(ctx.destination);
    expect(result).toBe(processor);
  });

  it('converts float32 PCM samples to int16 and calls onPcm', () => {
    const processor = {
      onaudioprocess: null as ((ev: AudioProcessingEvent) => void) | null,
      connect: vi.fn(),
    };
    const ctx = {
      state: 'running' as AudioContextState,
      resume: vi.fn(),
      destination: {},
      createScriptProcessor: vi.fn(() => processor),
    };
    const source = { connect: vi.fn() };
    const onPcm = vi.fn();

    connectScriptProcessorCapture(
      ctx as unknown as AudioContext,
      source as unknown as MediaStreamAudioSourceNode,
      onPcm,
    );

    // Simulate an onaudioprocess event with known samples
    const floatData = new Float32Array([0, 1, -1, 0.5]);
    const fakeEvent = {
      inputBuffer: {
        getChannelData: vi.fn(() => floatData),
      },
    } as unknown as AudioProcessingEvent;

    expect(processor.onaudioprocess).not.toBeNull();
    processor.onaudioprocess!(fakeEvent);

    expect(onPcm).toHaveBeenCalledOnce();
    const call = onPcm.mock.calls[0];
    if (!call) throw new Error('onPcm was not called');
    const buffer = call[0] as ArrayBuffer;
    const int16 = new Int16Array(buffer);
    expect(int16[0]).toBe(0);
    expect(int16[1]).toBe(0x7fff);
    expect(int16[2]).toBe(-0x8000);
  });
});
