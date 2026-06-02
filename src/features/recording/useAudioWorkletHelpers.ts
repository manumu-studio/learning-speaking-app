// Module-level helpers for AudioWorklet capture — no React deps, accept refs/callbacks as params
import {
  attachTrackMuteHandlers,
  attachVisibilityWarning,
  connectScriptProcessorCapture,
  createAudioContext,
  resumeAudioContext,
} from '@/lib/audio/audioContextCompat';
import type { ChunkReadyMessage } from '@/features/recording/workers/wav-chunker.worker';
import type { AudioWorkletRecordingState } from './useAudioWorklet.types';

export const DEFAULT_CHUNK_DURATION_SECS = 120;
export const DEFAULT_OVERLAP_SECS = 5;
export const DEFAULT_SAMPLE_RATE = 16_000;

export type CaptureMode = 'audioworklet' | 'scriptprocessor' | 'unsupported';

export interface WorkerCallbacks {
  onChunkReady: (message: ChunkReadyMessage) => void;
  onStopped: () => void;
  onError: (message: string) => void;
  setState: (state: AudioWorkletRecordingState) => void;
}

export interface WorkerConfig {
  sampleRate: number;
  chunkDurationSecs: number;
  overlapSecs: number;
}

export function createChunkWorkerInstance(config: WorkerConfig, callbacks: WorkerCallbacks): Worker {
  const worker = new Worker(
    new URL('./workers/wav-chunker.worker.ts', import.meta.url),
    { type: 'module' },
  );
  worker.onmessage = (event: MessageEvent<ChunkReadyMessage | { type: 'error'; message: string }>) => {
    const msg = event.data;
    if (msg.type === 'chunk-ready') {
      callbacks.onChunkReady(msg);
      if (msg.isFinal) { callbacks.onStopped(); }
      return;
    }
    callbacks.onError(msg.message);
  };
  worker.onerror = () => { callbacks.onError('Chunk worker failed unexpectedly'); };
  worker.postMessage({
    type: 'configure',
    sampleRate: config.sampleRate,
    chunkDurationSecs: config.chunkDurationSecs,
    overlapSecs: config.overlapSecs,
  });
  return worker;
}

export interface CleanupRefs {
  timerRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>;
  cleanupHandlersRef: React.MutableRefObject<Array<() => void>>;
  workletNodeRef: React.MutableRefObject<AudioWorkletNode | null>;
  scriptProcessorRef: React.MutableRefObject<ScriptProcessorNode | null>;
  sourceNodeRef: React.MutableRefObject<MediaStreamAudioSourceNode | null>;
  chunkWorkerRef: React.MutableRefObject<Worker | null>;
  streamRef: React.MutableRefObject<MediaStream | null>;
  audioContextRef: React.MutableRefObject<AudioContext | null>;
}

export function runCleanupCapture(
  refs: CleanupRefs,
  clearTimer: () => void,
  setMediaStream: (v: null) => void,
): void {
  clearTimer();
  for (const cleanup of refs.cleanupHandlersRef.current) { cleanup(); }
  refs.cleanupHandlersRef.current = [];
  refs.workletNodeRef.current?.disconnect();
  refs.workletNodeRef.current = null;
  refs.scriptProcessorRef.current?.disconnect();
  refs.scriptProcessorRef.current = null;
  refs.sourceNodeRef.current?.disconnect();
  refs.sourceNodeRef.current = null;
  const worker = refs.chunkWorkerRef.current;
  refs.chunkWorkerRef.current = null;
  worker?.terminate();
  const stream = refs.streamRef.current;
  refs.streamRef.current = null;
  if (stream) {
    for (const track of stream.getTracks()) { track.stop(); }
  }
  setMediaStream(null);
  const audioContext = refs.audioContextRef.current;
  refs.audioContextRef.current = null;
  if (audioContext && audioContext.state !== 'closed') {
    void audioContext.close();
  }
}

export async function setupWorkletCapture(
  audioContext: AudioContext,
  source: MediaStreamAudioSourceNode,
  forwardPcm: (samples: ArrayBuffer) => void,
): Promise<AudioWorkletNode> {
  await audioContext.audioWorklet.addModule('/worklets/pcm-collector.worklet.js');
  const workletNode = new AudioWorkletNode(audioContext, 'pcm-collector');
  workletNode.port.onmessage = (event: MessageEvent<{ type: string; samples: ArrayBuffer }>) => {
    if (event.data.type === 'pcm') { forwardPcm(event.data.samples); }
  };
  source.connect(workletNode);
  workletNode.connect(audioContext.destination);
  return workletNode;
}

export async function requestMicStream(sampleRate: number): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: { sampleRate, channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  });
}

export interface StartRecordingNodeRefs {
  streamRef: React.MutableRefObject<MediaStream | null>;
  audioContextRef: React.MutableRefObject<AudioContext | null>;
  workletNodeRef: React.MutableRefObject<AudioWorkletNode | null>;
  scriptProcessorRef: React.MutableRefObject<ScriptProcessorNode | null>;
  sourceNodeRef: React.MutableRefObject<MediaStreamAudioSourceNode | null>;
  chunkWorkerRef: React.MutableRefObject<Worker | null>;
  timerRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>;
  cleanupHandlersRef: React.MutableRefObject<Array<() => void>>;
  durationRef: React.MutableRefObject<number>;
}

export interface StartRecordingCallbacks {
  captureMode: CaptureMode;
  sampleRate: number;
  createWorker: () => Worker;
  forwardPcm: (samples: ArrayBuffer) => void;
  addWarning: (message: string) => void;
  setMediaStream: (s: MediaStream) => void;
  setDuration: (n: number) => void;
}

export async function executeStartRecording(
  refs: StartRecordingNodeRefs,
  cb: StartRecordingCallbacks,
): Promise<void> {
  const stream = await requestMicStream(cb.sampleRate);
  refs.streamRef.current = stream;
  cb.setMediaStream(stream);

  const audioContext = await createAudioContext(cb.sampleRate);
  refs.audioContextRef.current = audioContext;
  await resumeAudioContext(audioContext);
  const source = audioContext.createMediaStreamSource(stream);
  refs.sourceNodeRef.current = source;
  refs.chunkWorkerRef.current = cb.createWorker();

  if (cb.captureMode === 'audioworklet') {
    refs.workletNodeRef.current = await setupWorkletCapture(audioContext, source, cb.forwardPcm);
  } else {
    refs.scriptProcessorRef.current = connectScriptProcessorCapture(audioContext, source, cb.forwardPcm);
  }

  refs.cleanupHandlersRef.current.push(
    attachVisibilityWarning(audioContext, cb.addWarning),
    attachTrackMuteHandlers(stream, cb.addWarning),
  );
  refs.timerRef.current = setInterval(() => {
    refs.durationRef.current += 1;
    cb.setDuration(refs.durationRef.current);
  }, 1000);
}
