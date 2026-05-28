// TodaysWorkout — hero card at the top of the dashboard showing today's recommended workout
'use client';

import Link from 'next/link';
import type { PillarKey } from '@/features/dashboard/pillars';
import type { WorkoutRecommendation } from '@/features/dashboard/todaysWorkout';
import type { TodaysWorkoutProps } from './TodaysWorkout.types';

const PILLAR_BORDER_COLOR: Record<PillarKey, string> = {
  delivery: 'border-l-blue-500',
  language: 'border-l-violet-500',
  pronunciation: 'border-l-emerald-500',
};

const PILLAR_CHIP_CLASS: Record<PillarKey, string> = {
  delivery: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  language: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  pronunciation: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

function WorkoutHeader({ workoutNumber }: { workoutNumber: number }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 dark:border-slate-800">
      <span className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        Today&apos;s workout
      </span>
      {workoutNumber > 0 && (
        <span className="text-xs text-slate-400 dark:text-slate-500">Workout #{workoutNumber}</span>
      )}
    </div>
  );
}

function PillarChip({ pillarKey, label }: { pillarKey: PillarKey; label: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PILLAR_CHIP_CLASS[pillarKey]}`}>
      {label} pillar
    </span>
  );
}

function WorkoutBody({
  recommendation,
}: {
  recommendation: Extract<WorkoutRecommendation, { kind: 'workout' }>;
}) {
  return (
    <div className={`border-l-4 px-5 py-4 ${PILLAR_BORDER_COLOR[recommendation.pillarKey]}`}>
      <div className="mb-2 flex items-center gap-2">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          {recommendation.metricLabel}
        </h2>
        <PillarChip pillarKey={recommendation.pillarKey} label={recommendation.pillarLabel} />
      </div>

      <p className="mb-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        {recommendation.coachingTip}
      </p>

      {recommendation.promptSuggestion !== null && (
        <div className="mb-4 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/50">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Suggested topic
          </p>
          <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
            {recommendation.promptSuggestion.title}
          </p>
        </div>
      )}

      <Link
        href="/session/new"
        className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
      >
        Start workout
      </Link>
    </div>
  );
}

function CompletionBody({
  recommendation,
}: {
  recommendation: Extract<WorkoutRecommendation, { kind: 'workout' }>;
}) {
  return (
    <div className={`border-l-4 px-5 py-4 ${PILLAR_BORDER_COLOR[recommendation.pillarKey]}`}>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-lg" aria-hidden="true">
          ✅
        </span>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Great session!</h2>
      </div>

      <p className="mb-1 text-sm text-slate-600 dark:text-slate-300">
        You trained{' '}
        <span className="font-semibold text-slate-800 dark:text-slate-100">
          {recommendation.metricLabel}
        </span>{' '}
        today.
      </p>

      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        {recommendation.pillarLabel} pillar — keep the momentum going.
      </p>

      <Link
        href="/session/new"
        className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
      >
        Record another session
      </Link>
    </div>
  );
}

export function TodaysWorkout({
  recommendation,
  completedMetricKey,
  workoutNumber,
  className,
}: TodaysWorkoutProps) {
  let body: React.ReactNode;

  switch (recommendation.kind) {
    case 'workout': {
      if (
        completedMetricKey !== null &&
        completedMetricKey === recommendation.metricKey
      ) {
        body = <CompletionBody recommendation={recommendation} />;
      } else {
        body = <WorkoutBody recommendation={recommendation} />;
      }
      break;
    }
    case 'rest':
      body = (
        <div className="px-5 py-4">
          <p className="text-base font-semibold text-slate-800 dark:text-slate-100">
            🎯 Rest day earned
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {recommendation.message}
          </p>
        </div>
      );
      break;
    case 'welcome':
      body = (
        <div className="px-5 py-4">
          <p className="text-base font-semibold text-slate-800 dark:text-slate-100">
            👋 Welcome to your training hub
          </p>
          <p className="mt-1 mb-4 text-sm text-slate-500 dark:text-slate-400">
            {recommendation.message}
          </p>
          <Link
            href="/session/new"
            className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            Record first session
          </Link>
        </div>
      );
      break;
  }

  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 ${className ?? ''}`}
      aria-label="Today's workout recommendation"
    >
      <WorkoutHeader workoutNumber={workoutNumber} />
      {body}
    </div>
  );
}
