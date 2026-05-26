// DrillRecommendation — post-session card recommending a drill exercise
'use client';

import type { DrillRecommendationProps } from './DrillRecommendation.types';

const DRILL_TYPE_LABELS: Record<DrillRecommendationProps['drillType'], string> = {
  rephrase: 'Rephrase',
  constraint: 'Constraint',
  vocabUpgrade: 'Vocab Upgrade',
  precision: 'Precision',
  conclusion: 'Conclusion Builder',
  pronunciation: 'Pronunciation',
};

function formatTimeEstimate(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.ceil(seconds / 60);
  return `~${mins} min`;
}

export function DrillRecommendation({
  drillType,
  metricLabel,
  timeLimit,
  onStartDrill,
  className,
}: DrillRecommendationProps) {
  const label = DRILL_TYPE_LABELS[drillType];

  return (
    <div className={`rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-6 ${className ?? ''}`}>
      <h3 className="mb-2 text-lg font-semibold text-zinc-100">🏋️ Train This Pattern</h3>

      <p className="mb-4 text-sm text-zinc-400">
        Target your <span className="font-medium text-zinc-200">{metricLabel}</span> with a{' '}
        <span className="font-medium text-zinc-200">{label}</span> drill. Quick rep —{' '}
        {formatTimeEstimate(timeLimit)}.
      </p>

      <button
        type="button"
        onClick={onStartDrill}
        className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
      >
        Start Drill
      </button>
    </div>
  );
}
