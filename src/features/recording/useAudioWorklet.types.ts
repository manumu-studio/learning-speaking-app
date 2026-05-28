// Types for AudioWorklet-based chunked PCM recording
export type AudioWorkletRecordingState =
  | 'idle'
  | 'recording'
  | 'stopping'
  | 'stopped'
  | 'error';

export interface ChunkReadyEvent {
  chunkIndex: number;
  wavBlob: Blob;
  durationSecs: number;
  isFinal: boolean;
}

export interface UseAudioWorkletOptions {
  onChunkReady?: (event: ChunkReadyEvent) => void;
  onError?: (message: string) => void;
  chunkDurationSecs?: number;
  overlapSecs?: number;
  sampleRate?: number;
}

export interface UseAudioWorkletReturn {
  state: AudioWorkletRecordingState;
  duration: number;
  chunkIndex: number;
  mediaStream: MediaStream | null;
  captureMode: 'audioworklet' | 'scriptprocessor' | 'unsupported';
  error: string | null;
  warnings: string[];
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  resetRecording: () => void;
}
