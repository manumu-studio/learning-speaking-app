// Daily summary card — matches session hero card style with pillar score row
'use client';

import { ScoreChip } from '@/components/ui/ScoreChip';
import type { DailySummaryCardProps, PillarScores } from './DailySummaryCard.types';
import { useDailySummaryCard } from './useDailySummaryCard';

function formatFullDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDuration(totalSecs: number): string {
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function StatColumn({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 min-w-15">
      <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">{value}</span>
      <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</span>
    </div>
  );
}

const PILLAR_LABELS: Record<keyof PillarScores, string> = {
  delivery: 'Delivery',
  language: 'Language',
  pronunciation: 'Pronunciation',
};

const PILLAR_KEYS: (keyof PillarScores)[] = ['delivery', 'language', 'pronunciation'];

function PillarRow({ scores }: { scores: PillarScores }) {
  return (
    <div className="mt-4 grid grid-cols-3 gap-3">
      {PILLAR_KEYS.map((key) => {
        const score = scores[key];
        return (
          <div
            key={key}
            className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-3 text-center dark:border-slate-700 dark:bg-slate-800/60"
          >
            <span className="text-xs font-medium text-slate-500 dark:text-sky-300/70">
              {PILLAR_LABELS[key]}
            </span>
            <span className="text-xl font-bold text-slate-800 dark:text-slate-100">
              {score > 0 ? score.toFixed(1) : '—'}
            </span>
            {score > 0 && <ScoreChip score={score} scale="ten" />}
          </div>
        );
      })}
    </div>
  );
}

function SummarySkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse dark:border-slate-700 dark:bg-slate-800">
      <div className="h-3 w-40 bg-slate-200 dark:bg-slate-700 rounded" />
      <div className="h-5 w-full bg-slate-200 dark:bg-slate-700 rounded mt-3" />
      <div className="flex gap-6 mt-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 w-14 bg-slate-200 dark:bg-slate-700 rounded" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 mt-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-slate-200 dark:bg-slate-700 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function DailySummaryCard({ dateKey, onTapDay }: DailySummaryCardProps) {
  const { summary, isLoading, error } = useDailySummaryCard(dateKey);

  if (isLoading) return <SummarySkeleton />;
  if (error !== null || summary === null) return null;

  return (
    <div
      onClick={() => onTapDay?.(dateKey)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onTapDay?.(dateKey);
      }}
      className="cursor-pointer rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-800/80"
    >
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
        {formatFullDate(summary.date)}
      </p>

      <p className="text-slate-700 dark:text-slate-300 text-base leading-relaxed mb-5">
        {summary.topicSentence}
      </p>

      <div className="flex items-center gap-6 flex-wrap">
        <StatColumn value={formatDuration(summary.totalDurationSecs)} label="mins" />
        <StatColumn value={summary.totalWords > 0 ? String(summary.totalWords) : '--'} label="words" />
        <StatColumn value={String(summary.sessionCount)} label="sessions" />
        <StatColumn value={summary.overallScore.toFixed(1)} label="overall" />
      </div>

      <PillarRow scores={summary.pillarScores} />

      {summary.activeTargetsTomorrow.length > 0 && (
        <div className="mt-4">
          <span className="text-xs text-slate-400 dark:text-slate-500">Use tomorrow</span>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {summary.activeTargetsTomorrow.map((target) => (
              <span
                key={target}
                className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
              >
                {target}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
