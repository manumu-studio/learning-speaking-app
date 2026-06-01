// Browser-side PCM Int16 to WAV encoder — 44-byte RIFF header for 16kHz mono chunks
export const DEFAULT_SAMPLE_RATE = 16_000;
export const DEFAULT_CHANNELS = 1;
export const DEFAULT_BITS_PER_SAMPLE = 16;
export const WAV_HEADER_SIZE = 44;

export interface WavEncoderOptions {
  sampleRate?: number;
  numChannels?: number;
  bitsPerSample?: number;
}

export interface ResolvedWavOptions {
  sampleRate: number;
  numChannels: number;
  bitsPerSample: number;
}

function resolveOptions(options?: WavEncoderOptions): ResolvedWavOptions {
  return {
    sampleRate: options?.sampleRate ?? DEFAULT_SAMPLE_RATE,
    numChannels: options?.numChannels ?? DEFAULT_CHANNELS,
    bitsPerSample: options?.bitsPerSample ?? DEFAULT_BITS_PER_SAMPLE,
  };
}

/**
 * Converts Float32 audio samples in the range −1..1 to signed 16-bit PCM integers.
 *
 * Samples are clamped to [−1, 1] before scaling to avoid integer overflow.
 *
 * @param input - Float32 samples from a Web Audio API channel buffer.
 * @returns An `Int16Array` of equal length with quantized PCM values.
 */
export function float32ToInt16(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);

  for (let index = 0; index < input.length; index += 1) {
    const sample = input[index] ?? 0;
    const clamped = Math.max(-1, Math.min(1, sample));
    output[index] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }

  return output;
}

/**
 * Writes a standard 44-byte RIFF/PCM WAV header into the first 44 bytes of a `DataView`.
 *
 * The caller is responsible for ensuring the `DataView` has at least 44 bytes allocated
 * before the PCM data region.
 *
 * @param view - `DataView` over the target `ArrayBuffer` (must have room for a 44-byte header).
 * @param dataByteLength - Byte length of the PCM data that follows the header.
 * @param options - Optional audio format overrides (sampleRate, numChannels, bitsPerSample).
 */
export function writeWavHeader(
  view: DataView,
  dataByteLength: number,
  options?: WavEncoderOptions,
): void {
  const { sampleRate, numChannels, bitsPerSample } = resolveOptions(options);
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const fileSizeMinusEight = 36 + dataByteLength;

  const writeAscii = (offset: number, value: string): void => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeAscii(0, 'RIFF');
  view.setUint32(4, fileSizeMinusEight, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeAscii(36, 'data');
  view.setUint32(40, dataByteLength, true);
}

/**
 * Encodes Int16 PCM samples into a complete WAV `ArrayBuffer` including the RIFF header.
 *
 * @param samples - Int16 PCM audio samples (mono, 16 kHz by default).
 * @param options - Optional audio format overrides.
 * @returns A ready-to-upload WAV `ArrayBuffer`.
 */
export function encodePcmToWav(
  samples: Int16Array,
  options?: WavEncoderOptions,
): ArrayBuffer {
  const dataByteLength = samples.byteLength;
  const buffer = new ArrayBuffer(WAV_HEADER_SIZE + dataByteLength);
  const view = new DataView(buffer);

  writeWavHeader(view, dataByteLength, options);
  new Int16Array(buffer, WAV_HEADER_SIZE).set(samples);

  return buffer;
}

/**
 * Encodes Int16 PCM samples into a WAV `Blob` (MIME type `audio/wav`) for direct browser upload.
 *
 * @param samples - Int16 PCM audio samples.
 * @param options - Optional audio format overrides.
 * @returns A `Blob` with MIME type `audio/wav`.
 */
export function encodePcmToWavBlob(
  samples: Int16Array,
  options?: WavEncoderOptions,
): Blob {
  return new Blob([encodePcmToWav(samples, options)], { type: 'audio/wav' });
}

/**
 * Returns audio duration in seconds from a sample count.
 *
 * @param sampleCount - Total number of PCM samples.
 * @param sampleRate - Sample rate in Hz (defaults to `DEFAULT_SAMPLE_RATE` = 16 000).
 * @returns Duration in seconds.
 * @example
 * samplesToDurationSecs(48000) // => 3  (3 seconds at 16 kHz)
 */
export function samplesToDurationSecs(
  sampleCount: number,
  sampleRate = DEFAULT_SAMPLE_RATE,
): number {
  return sampleCount / sampleRate;
}
