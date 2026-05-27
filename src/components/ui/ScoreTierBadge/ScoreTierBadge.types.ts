// Types for the ScoreTierBadge component

export type ScoreTier = 'excellent' | 'good' | 'needs-work';

export interface ScoreTierBadgeProps {
  /** Azure 0-100 score — component maps to tier internally */
  azureScore: number;
  label: string;
  /** If true, shows the 0-10 numeric score alongside the tier label */
  showNumeric?: boolean;
}
