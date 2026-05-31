// Integration tests for parallel pipeline stitch, merge, and cancel helpers
import { describe, expect, it } from 'vitest';
import { findOverlapLength, stitchTranscripts } from '@/lib/pipeline/stitchTranscripts';
import { mergePronunciation } from '@/lib/pipeline/mergePronunciation';

describe('parallel pipeline helpers', () => {
  it('stitches three chunks with overlap boundaries', () => {
    const chunks = [
      { chunkIndex: 0, text: 'one two three four five', overlapSecs: 0 },
      { chunkIndex: 1, text: 'four five six seven eight', overlapSecs: 5 },
      { chunkIndex: 2, text: 'seven eight nine ten', overlapSecs: 5 },
    ];
    expect(stitchTranscripts(chunks)).toBe('one two three four five six seven eight nine ten');
  });

  it('mergePronunciation deduplicates weighted scores across chunks', () => {
    const report = (score: number) => ({
      pronScore: score,
      accuracyScore: score,
      fluencyScore: score,
      completenessScore: score,
      prosodyScore: score,
      words: [],
    });
    const merged = mergePronunciation([
      { chunkIndex: 0, durationSecs: 120, overlapSecs: 0, pronunciationReport: report(80) },
      { chunkIndex: 1, durationSecs: 125, overlapSecs: 5, pronunciationReport: report(90) },
    ]);
    expect(merged?.pronScore).toBeCloseTo(85);
  });

  it('findOverlapLength returns zero for unrelated boundaries', () => {
    expect(findOverlapLength(['alpha', 'beta'], ['gamma', 'delta'])).toBe(0);
  });
});
