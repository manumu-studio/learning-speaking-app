// Unit tests for chunked session timeline offsets
import { describe, expect, it } from 'vitest';
import { computeChunkTimeRange } from '@/lib/pipeline/chunkTiming';

describe('computeChunkTimeRange', () => {
  it('starts first chunk at zero', () => {
    const range = computeChunkTimeRange(0, [{ durationSecs: 30, overlapSecs: 1.5 }]);
    expect(range).toEqual({ startMs: 0, endMs: 30_000 });
  });

  it('subtracts overlap for later chunks', () => {
    const chunks = [
      { durationSecs: 30, overlapSecs: 1.5 },
      { durationSecs: 30, overlapSecs: 1.5 },
    ];
    const range = computeChunkTimeRange(1, chunks);
    expect(range.startMs).toBe(28_500);
    expect(range.endMs).toBe(58_500);
  });
});
