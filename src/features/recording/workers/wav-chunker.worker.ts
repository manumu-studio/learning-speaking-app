// Web Worker — ring buffer that emits 120s WAV chunks with 1.5s overlap between segments
import {
  DEFAULT_SAMPLE_RATE,
  encodePcmToWav,
  samplesToDurationSecs,
} from '@/lib/audio/wavEncoder';

const DEFAULT_CHUNK_DURATION_SECS = 120;
const DEFAULT_OVERLAP_SECS = 1.5;

interface ConfigureMessage {
  type: 'configure';
  sampleRate?: number;
  chunkDurationSecs?: number;
  overlapSecs?: number;
}

interface PcmMessage {
  type: 'pcm';
  samples: ArrayBuffer;
}

interface StopMessage {
  type: 'stop';
}

type WorkerInputMessage = ConfigureMessage | PcmMessage | StopMessage;

interface ChunkReadyMessage {
  type: 'chunk-ready';
  chunkIndex: number;
  wavBuffer: ArrayBuffer;
  durationSecs: number;
  sampleCount: number;
  isFinal: boolean;
}

interface WorkerErrorMessage {
  type: 'error';
  message: string;
}

type WorkerOutputMessage = ChunkReadyMessage | WorkerErrorMessage;

let sampleRate = DEFAULT_SAMPLE_RATE;
let chunkDurationSecs = DEFAULT_CHUNK_DURATION_SECS;
let overlapSecs = DEFAULT_OVERLAP_SECS;
let chunkSampleTarget = Math.floor(chunkDurationSecs * sampleRate);
let overlapSampleCount = Math.floor(overlapSecs * sampleRate);

const pendingSamples: number[] = [];
let overlapTail: Int16Array | null = null;
let chunkIndex = 0;
let isStopping = false;

function post(message: WorkerOutputMessage, transfer?: Transferable[]): void {
  if (transfer && transfer.length > 0) {
    self.postMessage(message, { transfer });
    return;
  }
  self.postMessage(message);
}

function resetState(): void {
  pendingSamples.length = 0;
  overlapTail = null;
  chunkIndex = 0;
  isStopping = false;
}

function configure(message: ConfigureMessage): void {
  sampleRate = message.sampleRate ?? DEFAULT_SAMPLE_RATE;
  chunkDurationSecs = message.chunkDurationSecs ?? DEFAULT_CHUNK_DURATION_SECS;
  overlapSecs = message.overlapSecs ?? DEFAULT_OVERLAP_SECS;
  chunkSampleTarget = Math.floor(chunkDurationSecs * sampleRate);
  overlapSampleCount = Math.floor(overlapSecs * sampleRate);
  resetState();
}

function appendPcm(samples: Int16Array): void {
  for (let index = 0; index < samples.length; index += 1) {
    pendingSamples.push(samples[index] ?? 0);
  }

  while (pendingSamples.length >= chunkSampleTarget) {
    emitChunk(false);
  }
}

function buildChunkSamples(finalChunk: boolean): Int16Array {
  if (chunkIndex === 0) {
    const takeCount = finalChunk
      ? pendingSamples.length
      : Math.min(pendingSamples.length, chunkSampleTarget);
    const chunk = Int16Array.from(pendingSamples.splice(0, takeCount));
    overlapTail = chunk.length >= overlapSampleCount
      ? chunk.slice(chunk.length - overlapSampleCount)
      : chunk.slice();
    return chunk;
  }

  const overlap = overlapTail ?? new Int16Array(0);
  const neededNewSamples = finalChunk
    ? pendingSamples.length
    : chunkSampleTarget - overlap.length;

  const newSamples = Int16Array.from(pendingSamples.splice(0, neededNewSamples));
  const combined = new Int16Array(overlap.length + newSamples.length);
  combined.set(overlap, 0);
  combined.set(newSamples, overlap.length);

  overlapTail = combined.length >= overlapSampleCount
    ? combined.slice(combined.length - overlapSampleCount)
    : combined.slice();

  return combined;
}

function emitChunk(isFinal: boolean): void {
  if (pendingSamples.length === 0 && chunkIndex > 0 && !isFinal) {
    return;
  }

  if (chunkIndex > 0 && pendingSamples.length === 0 && isFinal) {
    return;
  }

  const chunkSamples = buildChunkSamples(isFinal);
  if (chunkSamples.length === 0) {
    return;
  }

  const wavBuffer = encodePcmToWav(chunkSamples, { sampleRate });
  const durationSecs = samplesToDurationSecs(chunkSamples.length, sampleRate);

  post(
    {
      type: 'chunk-ready',
      chunkIndex,
      wavBuffer,
      durationSecs,
      sampleCount: chunkSamples.length,
      isFinal,
    },
    [wavBuffer],
  );

  chunkIndex += 1;
}

function handleStop(): void {
  isStopping = true;
  if (pendingSamples.length > 0 || chunkIndex === 0) {
    emitChunk(true);
  }
}

self.onmessage = (event: MessageEvent<WorkerInputMessage>) => {
  const message = event.data;

  try {
    switch (message.type) {
      case 'configure':
        configure(message);
        break;
      case 'pcm': {
        const samples = new Int16Array(message.samples);
        appendPcm(samples);
        if (isStopping && pendingSamples.length === 0) {
          handleStop();
        }
        break;
      }
      case 'stop':
        handleStop();
        break;
      default:
        post({ type: 'error', message: 'Unknown worker message type' });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Chunk worker failed';
    post({ type: 'error', message: errorMessage });
  }
};

export type { ChunkReadyMessage, WorkerInputMessage, WorkerOutputMessage };
