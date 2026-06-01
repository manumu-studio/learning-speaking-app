// Stitches per-chunk F0/intensity arrays into a single session-level contour
import type { ContourData } from '@/lib/praat/praat.types';

export interface ChunkFeatureSegment {
  startMs: number;
  endMs: number;
  frameMs: number;
  f0Hz: number[];
  intensityDb: number[];
  voiced: boolean[];
}

/** Merges ordered per-chunk F0/intensity segments into a single session-level contour array. */
export function stitchContours(segments: ChunkFeatureSegment[]): ContourData | null {
  if (segments.length === 0) {
    return null;
  }

  const ordered = [...segments].sort((a, b) => a.startMs - b.startMs);
  const frameMs = ordered[0]?.frameMs ?? 10;
  const last = ordered[ordered.length - 1];
  const durationMs = last?.endMs ?? 0;

  if (durationMs <= 0) {
    return null;
  }

  const frameCount = Math.ceil(durationMs / frameMs);
  const f0Hz = Array.from({ length: frameCount }, () => 0);
  const intensityDb = Array.from({ length: frameCount }, () => 0);
  const voiced = Array.from({ length: frameCount }, () => false);

  for (const segment of ordered) {
    const startFrame = Math.floor(segment.startMs / frameMs);

    segment.f0Hz.forEach((value, index) => {
      const targetIndex = startFrame + index;
      if (targetIndex >= frameCount) {
        return;
      }
      f0Hz[targetIndex] = value;
      intensityDb[targetIndex] = segment.intensityDb[index] ?? 0;
      voiced[targetIndex] = segment.voiced[index] ?? false;
    });
  }

  return {
    frameMs,
    f0Hz,
    intensityDb,
    voiced,
    durationMs,
  };
}
