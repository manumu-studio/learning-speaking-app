// Cross-browser AudioContext helpers — resume, capability detection, and interruption warnings
'use client';

export type AudioCaptureMode = 'audioworklet' | 'scriptprocessor' | 'unsupported';

export interface AudioContextCompatState {
  mode: AudioCaptureMode;
  warnings: string[];
}

const SCRIPT_PROCESSOR_BUFFER_SIZE = 4096;

export function detectAudioCaptureMode(): AudioCaptureMode {
  if (typeof window === 'undefined') {
    return 'unsupported';
  }

  if (typeof AudioWorkletNode !== 'undefined') {
    return 'audioworklet';
  }

  if (typeof ScriptProcessorNode !== 'undefined') {
    return 'scriptprocessor';
  }

  return 'unsupported';
}

export async function createAudioContext(sampleRate: number): Promise<AudioContext> {
  const AudioContextCtor =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextCtor) {
    throw new Error('Web Audio API is not supported in this browser');
  }

  return new AudioContextCtor({ sampleRate });
}

export async function resumeAudioContext(audioContext: AudioContext): Promise<void> {
  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }
}

export function attachVisibilityWarning(
  audioContext: AudioContext,
  onWarning: (message: string) => void,
): () => void {
  const handler = (): void => {
    if (document.visibilityState === 'hidden' && audioContext.state === 'suspended') {
      onWarning('Recording paused — keep this tab in the foreground for uninterrupted capture.');
    }
  };

  document.addEventListener('visibilitychange', handler);
  return () => document.removeEventListener('visibilitychange', handler);
}

export function attachTrackMuteHandlers(
  stream: MediaStream,
  onWarning: (message: string) => void,
): () => void {
  const cleanups: Array<() => void> = [];

  for (const track of stream.getAudioTracks()) {
    const handleMute = (): void => {
      onWarning('Microphone muted — check for phone calls or system interruptions.');
    };

    const handleUnmute = (): void => {
      onWarning('Microphone restored — recording continues.');
    };

    track.addEventListener('mute', handleMute);
    track.addEventListener('unmute', handleUnmute);

    cleanups.push(() => {
      track.removeEventListener('mute', handleMute);
      track.removeEventListener('unmute', handleUnmute);
    });
  }

  return () => {
    for (const cleanup of cleanups) {
      cleanup();
    }
  };
}

export function connectScriptProcessorCapture(
  audioContext: AudioContext,
  source: MediaStreamAudioSourceNode,
  onPcm: (samples: ArrayBuffer) => void,
): ScriptProcessorNode {
  const processor = audioContext.createScriptProcessor(
    SCRIPT_PROCESSOR_BUFFER_SIZE,
    1,
    1,
  );

  processor.onaudioprocess = (event: AudioProcessingEvent) => {
    const input = event.inputBuffer.getChannelData(0);
    const int16 = new Int16Array(input.length);

    for (let index = 0; index < input.length; index += 1) {
      const sample = input[index] ?? 0;
      const clamped = Math.max(-1, Math.min(1, sample));
      int16[index] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    }

    onPcm(int16.buffer.slice(0));
  };

  source.connect(processor);
  processor.connect(audioContext.destination);

  return processor;
}

export function getInitialCompatState(): AudioContextCompatState {
  const mode = detectAudioCaptureMode();
  const warnings: string[] = [];

  if (mode === 'scriptprocessor') {
    warnings.push('Using legacy audio capture — update Safari for best recording quality.');
  }

  if (typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    warnings.push('Keep your screen on while recording for uninterrupted capture.');
  }

  return { mode, warnings };
}
