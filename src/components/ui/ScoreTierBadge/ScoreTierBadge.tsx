// ScoreTierBadge: displays a pronunciation score as a human-readable tier badge
'use client';

import React from 'react';
import type { ScoreTierBadgeProps, ScoreTier } from './ScoreTierBadge.types';

const TIER_CONFIG = {
  excellent: {
    label: 'Excellent',
    classes: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  },
  good: {
    label: 'Good',
    classes: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  },
  'needs-work': {
    label: 'Needs Work',
    classes: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  },
} as const;

function azureScoreToTier(azureScore: number): ScoreTier {
  if (azureScore >= 80) return 'excellent';
  if (azureScore >= 60) return 'good';
  return 'needs-work';
}

function azureScoreToDisplay(azureScore: number): number {
  return Math.round(azureScore / 10);
}

export function ScoreTierBadge({
  azureScore,
  label,
  showNumeric = false,
}: ScoreTierBadgeProps): React.JSX.Element {
  const tier = azureScoreToTier(azureScore);
  const { label: tierLabel, classes } = TIER_CONFIG[tier];
  const displayScore = azureScoreToDisplay(azureScore);

  return (
    <div className="flex flex-col items-center gap-1.5 min-w-[80px]">
      <span
        className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${classes}`}
        aria-label={`${label}: ${tierLabel}${showNumeric ? ` (${displayScore}/10)` : ''}`}
      >
        {tierLabel}
      </span>
      {showNumeric && (
        <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
          {displayScore}/10
        </span>
      )}
      <span className="text-xs text-gray-600 dark:text-gray-400 text-center leading-tight">
        {label}
      </span>
    </div>
  );
}
