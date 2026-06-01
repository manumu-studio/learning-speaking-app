// TimedRecording — countdown timer and round tracker for 4-3-2 fluency training
'use client';

import type { CompletedRound, RoundNumber } from './TimedRecording.types';
import type { TimedRecordingProps } from './TimedRecording.types';
import { useTimedRecording } from './useTimedRecording';

/** Formats seconds into MM:SS display */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/** Returns Tailwind color classes based on remaining time */
function timerColorClass(timeRemaining: number): string {
  if (timeRemaining <= 10) return 'text-amber-500 dark:text-amber-400 animate-pulse';
  if (timeRemaining <= 30) return 'text-amber-500 dark:text-amber-400';
  return 'text-emerald-500 dark:text-emerald-400';
}

function RoundIndicator({
  roundNumber,
  currentRound,
  isActive,
  isProcessing,
  completedRound,
}: {
  roundNumber: RoundNumber;
  currentRound: RoundNumber;
  isActive: boolean;
  isProcessing: boolean;
  completedRound: CompletedRound | undefined;
}) {
  const targetMinutes = roundNumber === 1 ? 4 : roundNumber === 2 ? 3 : 2;

  // Completed round
  if (completedRound) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-950/30">
        <span className="text-lg" aria-hidden="true">
          ✅
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Round {roundNumber} — {targetMinutes} min
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {completedRound.speechRateWpm !== null
              ? `${completedRound.speechRateWpm} WPM`
              : 'Processing WPM...'}
            {completedRound.fillerCount !== null
              ? ` · ${completedRound.fillerCount} fillers`
              : ''}
          </p>
        </div>
      </div>
    );
  }

  // Current round
  if (roundNumber === currentRound) {
    const statusText = isProcessing
      ? 'Processing...'
      : isActive
        ? 'Recording...'
        : 'Ready';

    return (
      <div className="flex items-center gap-3 rounded-lg border border-blue-300 bg-blue-50 px-4 py-3 dark:border-blue-700 dark:bg-blue-950/30">
        <span className="text-lg" aria-hidden="true">
          {isProcessing ? '⏳' : '🔵'}
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Round {roundNumber} — {targetMinutes} min
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400">
            {statusText}
          </p>
        </div>
      </div>
    );
  }

  // Upcoming round
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/40">
      <span className="text-lg text-slate-300 dark:text-slate-600" aria-hidden="true">
        ⬜
      </span>
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-400 dark:text-slate-500">
          Round {roundNumber} — {targetMinutes} min
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-600">Up next</p>
      </div>
    </div>
  );
}

export function TimedRecording({
  fluencySessionId,
  promptTitle,
  promptText,
  completedRounds,
  onAllRoundsComplete,
}: TimedRecordingProps) {
  const {
    currentRound,
    targetSeconds,
    timeRemaining,
    isActive,
    isGracePeriod,
    isProcessing,
    roundResults,
    start,
    stop,
  } = useTimedRecording({
    fluencySessionId,
    initialRounds: completedRounds,
    onAllRoundsComplete,
  });

  const targetMinutes = Math.floor(targetSeconds / 60);
  const rounds: RoundNumber[] = [1, 2, 3];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Round header */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Round {currentRound} of 3 — Target: {targetMinutes}:00
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {promptTitle}
        </p>
      </div>

      {/* Prompt display */}
      <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 dark:border-slate-700 dark:bg-gray-900">
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          {promptText}
        </p>
      </div>

      {/* Countdown timer */}
      <div className="flex flex-col items-center gap-2">
        <span
          role="timer"
          aria-live="polite"
          aria-label="Time remaining"
          className={`font-mono text-6xl font-bold tabular-nums ${timerColorClass(timeRemaining)}`}
        >
          {formatTime(timeRemaining)}
        </span>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {isGracePeriod
            ? 'Finish your thought — auto-stopping shortly...'
            : 'Retell the same content — aim to be more fluent!'}
        </p>
      </div>

      {/* Start / Stop button */}
      <div className="flex justify-center">
        {isActive ? (
          <button
            type="button"
            onClick={stop}
            disabled={isProcessing}
            className="rounded-xl bg-slate-700 px-8 py-3 text-lg font-semibold text-white transition-colors hover:bg-slate-600 disabled:opacity-50 dark:bg-slate-600 dark:hover:bg-slate-500"
          >
            Stop Recording
          </button>
        ) : (
          <button
            type="button"
            onClick={start}
            disabled={isProcessing}
            className="rounded-xl bg-emerald-600 px-8 py-3 text-lg font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50 dark:bg-emerald-700 dark:hover:bg-emerald-600"
          >
            {isProcessing ? 'Processing...' : 'Start Recording'}
          </button>
        )}
      </div>

      {/* completeRound trigger — exposed for parent to call with speakingSessionId */}
      {/* Parent page should call completeRound(speakingSessionId) after recording finishes */}

      {/* Round progress sidebar */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Round Progress
        </h3>
        {rounds.map((rn) => (
          <RoundIndicator
            key={rn}
            roundNumber={rn}
            currentRound={currentRound}
            isActive={isActive}
            isProcessing={isProcessing}
            completedRound={roundResults.find((r) => r.roundNumber === rn)}
          />
        ))}
      </div>
    </div>
  );
}
