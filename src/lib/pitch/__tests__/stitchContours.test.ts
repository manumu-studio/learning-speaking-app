// Unit tests for stitching chunk pitch contours into a session timeline
import { describe, expect, it } from 'vitest';
import { stitchContours } from '@/lib/pitch/stitchContours';

describe('stitchContours', () => {
  it('returns null for empty segments', () => {
    expect(stitchContours([])).toBeNull();
  });

  it('places chunk frames at startMs offsets', () => {
    const result = stitchContours([
      {
        startMs: 0,
        endMs: 20,
        frameMs: 10,
        f0Hz: [120, 130],
        intensityDb: [60, 62],
        voiced: [true, true],
      },
      {
        startMs: 20,
        endMs: 40,
        frameMs: 10,
        f0Hz: [140, 150],
        intensityDb: [64, 66],
        voiced: [true, true],
      },
    ]);

    expect(result).not.toBeNull();
    expect(result?.f0Hz[0]).toBe(120);
    expect(result?.f0Hz[2]).toBe(140);
    expect(result?.durationMs).toBe(40);
  });
});
