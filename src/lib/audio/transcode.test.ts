// Unit tests for the toPcm16kMonoWav audio transcoder
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { toPcm16kMonoWav } from './transcode';

const FIXTURE_PATH = path.join(__dirname, '__fixtures__/sample.webm');

describe('toPcm16kMonoWav', () => {
  it('converts a valid WebM buffer and returns a buffer with RIFF WAV header', async () => {
    const input = readFileSync(FIXTURE_PATH);
    const output = await toPcm16kMonoWav(input);
    expect(output.subarray(0, 4).toString('ascii')).toBe('RIFF');
  });

  it('output contains WAVE marker at byte 8', async () => {
    const input = readFileSync(FIXTURE_PATH);
    const output = await toPcm16kMonoWav(input);
    expect(output.subarray(8, 12).toString('ascii')).toBe('WAVE');
  });

  it('output is non-trivially sized (>= 44 bytes for a valid WAV)', async () => {
    const input = readFileSync(FIXTURE_PATH);
    const output = await toPcm16kMonoWav(input);
    // WAV header alone is 44 bytes; a 5s 16kHz mono file is ~160KB
    expect(output.length).toBeGreaterThan(44);
  });

  it('throws on corrupt input (random bytes)', async () => {
    const corrupt = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xde, 0xad, 0xbe, 0xef]);
    await expect(toPcm16kMonoWav(corrupt)).rejects.toThrow();
  });

  it('throws on empty input', async () => {
    await expect(toPcm16kMonoWav(Buffer.alloc(0))).rejects.toThrow();
  });
});
