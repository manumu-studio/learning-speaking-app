// Types for the ScoreChip coaching label badge

export type ScoreScale = 'ten' | 'hundred';

export type ChipVariant = 'on-track' | 'building' | 'sharpen';

export interface ScoreChipProps {
  /** Numeric score — interpreted by scale (1-10 or 0-100) */
  score: number;
  scale: ScoreScale;
  /** Optional label override (e.g. speaking-rate status text) */
  label?: string;
  className?: string | undefined;
}
