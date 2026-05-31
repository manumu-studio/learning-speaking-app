// ScoreChip: coaching-oriented pill badge that maps scores to On track / Building / Sharpen labels

import React from 'react';
import type { ChipVariant, ScoreChipProps, ScoreScale } from './ScoreChip.types';

const TIER_CONFIG = {
  'on-track': {
    label: 'On track',
    classes: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  building: {
    label: 'Building',
    classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  sharpen: {
    label: 'Sharpen',
    classes: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  },
} as const satisfies Record<ChipVariant, { label: string; classes: string }>;

function scoreToTier(score: number, scale: ScoreScale): ChipVariant {
  if (scale === 'ten') {
    if (score >= 8) return 'on-track';
    if (score >= 5) return 'building';
    return 'sharpen';
  }

  if (score >= 80) return 'on-track';
  if (score >= 60) return 'building';
  return 'sharpen';
}

export function ScoreChip({ score, scale, label, className }: ScoreChipProps): React.JSX.Element {
  const tier = scoreToTier(score, scale);
  const { label: tierLabel, classes } = TIER_CONFIG[tier];
  const displayLabel = label ?? tierLabel;

  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        classes,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={displayLabel}
    >
      {displayLabel}
    </span>
  );
}
