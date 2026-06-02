// Round progress indicator showing completed, current, and upcoming rounds
'use client';

import type { CompletedRound, RoundNumber } from './TimedRecording.types';

export interface RoundIndicatorProps {
  roundNumber: RoundNumber;
  currentRound: RoundNumber;
  isActive: boolean;
  isProcessing: boolean;
  completedRound: CompletedRound | undefined;
}

/** Maps each round number to its target duration in minutes */
const ROUND_TARGET_MINUTES: Record<RoundNumber, number> = {
  1: 4,
  2: 3,
  3: 2,
};

/** Renders a completed round row with WPM and filler stats */
function CompletedRoundRow({
  roundNumber,
  completedRound,
}: {
  roundNumber: RoundNumber;
  completedRound: CompletedRound;
}) {
  const targetMinutes = ROUND_TARGET_MINUTES[roundNumber];
  const wpmLabel =
    completedRound.speechRateWpm !== null
      ? `${completedRound.speechRateWpm} WPM`
      : 'Processing WPM...';
  const fillerLabel =
    completedRound.fillerCount !== null
      ? ` · ${completedRound.fillerCount} fillers`
      : '';

  return (
    <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-950/30">
      <span className="text-lg" aria-hidden="true">✅</span>
      <div className="flex-1">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Round {roundNumber} — {targetMinutes} min
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {wpmLabel}{fillerLabel}
        </p>
      </div>
    </div>
  );
}

/** Renders the currently active round row */
function ActiveRoundRow({
  roundNumber,
  isActive,
  isProcessing,
}: {
  roundNumber: RoundNumber;
  isActive: boolean;
  isProcessing: boolean;
}) {
  const targetMinutes = ROUND_TARGET_MINUTES[roundNumber];
  const statusText = isProcessing ? 'Processing...' : isActive ? 'Recording...' : 'Ready';

  return (
    <div className="flex items-center gap-3 rounded-lg border border-blue-300 bg-blue-50 px-4 py-3 dark:border-blue-700 dark:bg-blue-950/30">
      <span className="text-lg" aria-hidden="true">
        {isProcessing ? '⏳' : '🔵'}
      </span>
      <div className="flex-1">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Round {roundNumber} — {targetMinutes} min
        </p>
        <p className="text-xs text-blue-600 dark:text-blue-400">{statusText}</p>
      </div>
    </div>
  );
}

/** Renders an upcoming (not yet started) round row */
function UpcomingRoundRow({ roundNumber }: { roundNumber: RoundNumber }) {
  const targetMinutes = ROUND_TARGET_MINUTES[roundNumber];

  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/40">
      <span className="text-lg text-slate-300 dark:text-slate-600" aria-hidden="true">⬜</span>
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-400 dark:text-slate-500">
          Round {roundNumber} — {targetMinutes} min
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-600">Up next</p>
      </div>
    </div>
  );
}

/** Displays the state of a single round — completed, active, or upcoming */
export function RoundIndicator({
  roundNumber,
  currentRound,
  isActive,
  isProcessing,
  completedRound,
}: RoundIndicatorProps) {
  if (completedRound) {
    return <CompletedRoundRow roundNumber={roundNumber} completedRound={completedRound} />;
  }
  if (roundNumber === currentRound) {
    return (
      <ActiveRoundRow
        roundNumber={roundNumber}
        isActive={isActive}
        isProcessing={isProcessing}
      />
    );
  }
  return <UpcomingRoundRow roundNumber={roundNumber} />;
}
