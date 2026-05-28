// Unit tests for browser-side WAV encoder utilities
import { describe, expect, it } from 'vitest';
import {
  WAV_HEADER_SIZE,
  encodePcmToWav,
  float32ToInt16,
  samplesToDurationSecs,
  writeWavHeader,
} from '@/lib/audio/wavEncoder';

describe('wavEncoder', () => {
  it('writes a valid RIFF/WAVE header', () => {
    const buffer = new ArrayBuffer(WAV_HEADER_SIZE);
    writeWavHeader(new DataView(buffer), 32000);

    const view = new DataView(buffer);
    expect(String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3))).toBe('RIFF');
    expect(String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11))).toBe('WAVE');
  });

  it('converts float samples to int16 PCM', () => {
    const input = new Float32Array([0, 1, -1]);
    const output = float32ToInt16(input);

    expect(output[0]).toBe(0);
    expect(output[1]).toBe(0x7fff);
    expect(output[2]).toBe(-0x8000);
  });

  it('encodes PCM samples into a WAV buffer', () => {
    const samples = new Int16Array([0, 1000, -1000]);
    const wav = encodePcmToWav(samples);

    expect(wav.byteLength).toBe(WAV_HEADER_SIZE + samples.byteLength);
    const view = new DataView(wav);
    expect(view.getUint32(40, true)).toBe(samples.byteLength);
  });

  it('computes duration from sample count', () => {
    expect(samplesToDurationSecs(16000)).toBe(1);
    expect(samplesToDurationSecs(32000, 16000)).toBe(2);
  });
});
