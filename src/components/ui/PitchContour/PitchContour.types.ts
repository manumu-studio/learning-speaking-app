// Type definitions for PitchContour visualization component
import type { ContourData } from '@/lib/praat/praat.types';

export interface PitchContourProps {
  contour: ContourData;
  animationDelay: number;
}

export type PitchContourState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; contour: ContourData }
  | { status: 'empty' }
  | { status: 'error' };
