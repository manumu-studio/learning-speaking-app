// PersonalRecordBanner — gold ribbon shown when session sets a personal best
'use client';

import type { PersonalRecordBannerProps } from './PersonalRecordBanner.types';

export function PersonalRecordBanner({
  personalRecords,
  animationDelay,
}: PersonalRecordBannerProps) {
  if (personalRecords.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 space-y-2">
      {personalRecords.map((record, index) => (
        <div
          key={record.metricKey}
          className="flex items-center gap-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 px-4 py-3 opacity-0"
          style={{
            animation: 'fadeInUp 0.5s ease-out forwards',
            animationDelay: `${(animationDelay ?? 0) + index * 80}ms`,
          }}
        >
          <span className="text-xl" aria-hidden="true">
            🏆
          </span>
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              New PR — Best {record.metricLabel}
              {record.timeframe !== 'all-time' ? ` in ${record.timeframe}` : ' (all-time)'}
            </p>
            {record.previousBest !== null && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {record.score.toFixed(1)} → up from {record.previousBest.toFixed(1)}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
