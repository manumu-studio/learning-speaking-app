// Success state showing voice profile metrics after session processing completes
'use client';

import type { VoiceProfileMetric } from './VoiceProfile.types';

interface VoiceProfileResultsProps {
  pronScore: number | null;
  speakingRateWpm: number | null;
  focusAreas: VoiceProfileMetric[];
  onStartTraining: () => void;
}

function scoreBandClass(score: number): string {
  if (score >= 8) return 'text-green-600 dark:text-green-400';
  if (score >= 6) return 'text-amber-600 dark:text-amber-400';
  return 'text-blue-600 dark:text-blue-400';
}

function PronScoreDisplay({
  pronScore,
  speakingRateWpm,
}: {
  pronScore: number;
  speakingRateWpm: number | null;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-6xl font-extrabold text-blue-600 dark:text-blue-400">
        {Math.round(pronScore)}
      </span>
      <span className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold">
        Pronunciation score
      </span>
      {speakingRateWpm !== null && (
        <span className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          {Math.round(speakingRateWpm)} words / min
        </span>
      )}
    </div>
  );
}

function FocusAreasList({ focusAreas }: { focusAreas: VoiceProfileMetric[] }) {
  return (
    <div className="w-full space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
        Your top focus areas
      </p>
      {focusAreas.map((metric) => (
        <div
          key={metric.key}
          className="flex items-center justify-between rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3"
        >
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {metric.label}
          </span>
          <span className={`text-sm font-bold ${scoreBandClass(metric.score)}`}>
            {metric.score}/10
          </span>
        </div>
      ))}
    </div>
  );
}

export function VoiceProfileResults({
  pronScore,
  speakingRateWpm,
  focusAreas,
  onStartTraining,
}: VoiceProfileResultsProps) {
  return (
    <div className="flex flex-col items-center gap-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
          Your voice profile is ready
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Here&apos;s a snapshot of your speaking today.
        </p>
      </div>

      {pronScore !== null && (
        <PronScoreDisplay pronScore={pronScore} speakingRateWpm={speakingRateWpm} />
      )}

      {focusAreas.length > 0 && <FocusAreasList focusAreas={focusAreas} />}

      <button
        type="button"
        onClick={onStartTraining}
        className="
          w-full rounded-xl bg-blue-600 px-6 py-4 text-base font-semibold text-white
          hover:bg-blue-700 active:bg-blue-800
          transition-colors duration-150
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          dark:focus:ring-offset-black
        "
      >
        Start training
      </button>
    </div>
  );
}
