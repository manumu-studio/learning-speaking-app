// TimedRecording — countdown timer and round tracker for 4-3-2 fluency training
'use client';

import type { RoundNumber, CompletedRound } from './TimedRecording.types';
import type { TimedRecordingProps } from './TimedRecording.types';
import { useTimedRecording } from './useTimedRecording';
import { RoundIndicator } from './RoundIndicator';
import { RecordButton } from './RecordButton';

const ROUNDS: RoundNumber[] = [1, 2, 3];

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

interface RoundProgressProps {
  currentRound: RoundNumber;
  isActive: boolean;
  isProcessing: boolean;
  roundResults: CompletedRound[];
}

/** List of round status indicators */
function RoundProgress({ currentRound, isActive, isProcessing, roundResults }: RoundProgressProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        Round Progress
      </h3>
      {ROUNDS.map((rn) => (
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
  );
}

export function TimedRecording({
  fluencySessionId,
  promptTitle,
  promptText,
  completedRounds,
  onAllRoundsComplete,
}: TimedRecordingProps) {
  const { currentRound, targetSeconds, timeRemaining, isActive, isGracePeriod, isProcessing, roundResults, start, stop } =
    useTimedRecording({ fluencySessionId, initialRounds: completedRounds, onAllRoundsComplete });

  const targetMinutes = Math.floor(targetSeconds / 60);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Round {currentRound} of 3 — Target: {targetMinutes}:00
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{promptTitle}</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 dark:border-slate-700 dark:bg-gray-900">
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{promptText}</p>
      </div>

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

      <div className="flex justify-center">
        <RecordButton isActive={isActive} isProcessing={isProcessing} onStart={start} onStop={stop} />
      </div>

      <RoundProgress
        currentRound={currentRound}
        isActive={isActive}
        isProcessing={isProcessing}
        roundResults={roundResults}
      />
    </div>
  );
}
