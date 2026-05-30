// Type definitions for Praat parselmouth contour service responses
export interface ContourData {
  frameMs: number;
  f0Hz: number[];
  intensityDb: number[];
  voiced: boolean[];
  durationMs: number;
}

export interface ExtractContourResult {
  status: 'ok' | 'error';
  contour: ContourData | null;
  error: string | null;
}
