// PronunciationProgress: shows a sparkline and trend sentence for pronunciation scores over recent sessions
'use client';

import React from 'react';
import type { PronunciationProgressProps, TrendSummary, TrendDirection } from './PronunciationProgress.types';

const SPARKLINE_MAX_HEIGHT_PX = 24;

function computeTrend(history: { fluencyScore: number; accuracyScore: number }[]): TrendSummary | null {
  if (history.length < 2) return null;

  const prev = history[history.length - 2];
  const curr = history[history.length - 1];

  if (prev === undefined || curr === undefined) return null;

  const fluencyDelta = curr.fluencyScore - prev.fluencyScore;
  const metric: 'fluency' | 'accuracy' = Math.abs(fluencyDelta) >= 1 ? 'fluency' : 'accuracy';
  const delta = metric === 'fluency' ? fluencyDelta : curr.accuracyScore - prev.accuracyScore;
  const deltaPercent = Math.round(delta);

  const direction: TrendDirection =
    deltaPercent > 1 ? 'up' : deltaPercent < -1 ? 'down' : 'flat';

  return { metric, deltaPercent, direction };
}

function directionColour(direction: TrendDirection): string {
  if (direction === 'up') return 'text-green-600 dark:text-green-400';
  if (direction === 'down') return 'text-amber-600 dark:text-amber-400';
  return 'text-gray-500 dark:text-gray-400';
}

function directionIcon(direction: TrendDirection): string {
  if (direction === 'up') return '↑';
  if (direction === 'down') return '↓';
  return '→';
}

export function PronunciationProgress({
  history,
  animationDelay,
}: PronunciationProgressProps): React.JSX.Element | null {
  if (history.length === 0) return null;

  const trend = computeTrend(history);
  const maxScore = Math.max(...history.map((h) => h.fluencyScore), 1);

  return (
    <section
      className="opacity-0"
      style={{
        animation: 'fadeInUp 0.5s ease-out forwards',
        animationDelay: `${animationDelay}ms`,
      }}
      aria-labelledby="progress-heading"
    >
      <h3
        id="progress-heading"
        className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide"
      >
        Your progress
      </h3>

      <div
        className="flex items-end gap-1 mb-3"
        role="img"
        aria-label={`Fluency trend over last ${history.length} sessions`}
      >
        {history.map((item, i) => {
          const heightPx = Math.max(
            4,
            Math.round((item.fluencyScore / maxScore) * SPARKLINE_MAX_HEIGHT_PX)
          );
          const isLast = i === history.length - 1;
          return (
            <div
              key={item.sessionId}
              className={[
                'rounded-sm flex-1',
                isLast
                  ? 'bg-blue-500 dark:bg-blue-400'
                  : 'bg-gray-300 dark:bg-gray-600',
              ].join(' ')}
              style={{ height: `${heightPx}px` }}
              title={`Fluency: ${Math.round(item.fluencyScore)}`}
            />
          );
        })}
      </div>

      {trend !== null ? (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {trend.metric === 'fluency' ? 'Fluency' : 'Accuracy'}{' '}
          <span className={`font-semibold ${directionColour(trend.direction)}`}>
            {directionIcon(trend.direction)}{' '}
            {trend.direction === 'flat'
              ? 'holding steady'
              : `${trend.direction === 'up' ? '+' : ''}${trend.deltaPercent} pts vs last session`}
          </span>
        </p>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Complete more sessions to see your trend.
        </p>
      )}
    </section>
  );
}
