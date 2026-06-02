// Horizontal SVG bar chart showing speech rate (WPM) across fluency rounds
'use client';

import type { FluencyRoundResult } from './FluencyComparison.types';

export interface WpmBarChartProps {
  rounds: FluencyRoundResult[];
}

const BAR_HEIGHT = 28;
const BAR_GAP = 8;
const LABEL_WIDTH = 80;
const CHART_WIDTH = 320;

interface BarRowProps {
  round: FluencyRoundResult;
  maxWpm: number;
  index: number;
}

/** Renders a single bar row for one round */
function BarRow({ round, maxWpm, index }: BarRowProps) {
  const wpm = round.speechRateWpm;
  const barWidth = wpm !== null ? (wpm / maxWpm) * CHART_WIDTH : 0;
  const y = index * (BAR_HEIGHT + BAR_GAP);
  const opacity = 1 - index * 0.2;

  return (
    <g key={round.roundNumber}>
      <text
        x={0}
        y={y + BAR_HEIGHT / 2 + 5}
        className="fill-slate-500 text-xs dark:fill-slate-400"
      >
        Round {round.roundNumber}
      </text>

      {wpm !== null ? (
        <rect
          x={LABEL_WIDTH}
          y={y}
          width={barWidth}
          height={BAR_HEIGHT}
          rx={6}
          fill="#10b981"
          opacity={opacity}
        />
      ) : (
        <rect
          x={LABEL_WIDTH}
          y={y}
          width={CHART_WIDTH * 0.3}
          height={BAR_HEIGHT}
          rx={6}
          className="animate-pulse fill-slate-200 dark:fill-slate-700"
        />
      )}

      <text
        x={LABEL_WIDTH + barWidth + 8}
        y={y + BAR_HEIGHT / 2 + 5}
        className="fill-slate-700 text-sm font-semibold dark:fill-slate-200"
      >
        {wpm !== null ? `${wpm} WPM` : '...'}
      </text>
    </g>
  );
}

/** Horizontal SVG bar chart comparing WPM across all rounds */
export function WpmBarChart({ rounds }: WpmBarChartProps) {
  const wpmValues = rounds.map((r) => r.speechRateWpm ?? 0);
  const maxWpm = Math.max(...wpmValues, 1);
  const totalHeight = rounds.length * (BAR_HEIGHT + BAR_GAP) - BAR_GAP;

  return (
    <svg
      viewBox={`0 0 ${LABEL_WIDTH + CHART_WIDTH + 60} ${totalHeight}`}
      className="w-full max-w-md"
      role="img"
      aria-label="Speech rate comparison chart"
    >
      {rounds.map((round, i) => (
        <BarRow key={round.roundNumber} round={round} maxWpm={maxWpm} index={i} />
      ))}
    </svg>
  );
}
