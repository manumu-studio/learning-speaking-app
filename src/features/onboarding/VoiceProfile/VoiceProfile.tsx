// Voice profile results screen — shown after onboarding recording is processed
'use client';

import { useRouter } from 'next/navigation';
import { ProcessingStatus } from '@/components/ui/ProcessingStatus';
import { isSpeakingMetricKey } from '@/lib/metric-keys';
import { useVoiceProfile } from './useVoiceProfile';
import type { VoiceProfileProps } from './VoiceProfile.types';
import type { ProcessingStatusProps } from '@/components/ui/ProcessingStatus/ProcessingStatus.types';

const FOCUS_STORAGE_KEY = 'lsa-focus';

const FOCUS_LABEL_MAP: Record<string, string> = {
  connectorRepetition: 'Connector Variety',
  structuralVariety: 'Sentence Structure',
  vocabularyPrecision: 'Vocabulary Precision',
  verbAccuracy: 'Verb Accuracy',
  argumentClosure: 'Argument Closure',
  fillerUsage: 'Filler Reduction',
  pronunciationAccuracy: 'Pronunciation',
  prosodyScore: 'Rhythm & Prosody',
  speakingRate: 'Speaking Rate',
};

function scoreBandClass(score: number): string {
  if (score >= 8) return 'text-green-600 dark:text-green-400';
  if (score >= 6) return 'text-amber-600 dark:text-amber-400';
  return 'text-blue-600 dark:text-blue-400';
}

export function VoiceProfile({ sessionId }: VoiceProfileProps) {
  const router = useRouter();
  const {
    isProcessing,
    isDone,
    isFailed,
    status,
    pronScore,
    speakingRateWpm,
    focusAreas,
    weakestMetricKey,
  } = useVoiceProfile(sessionId);

  const handleStartTraining = async () => {
    if (weakestMetricKey !== null && isSpeakingMetricKey(weakestMetricKey)) {
      const label = FOCUS_LABEL_MAP[weakestMetricKey] ?? weakestMetricKey;
      localStorage.setItem(
        FOCUS_STORAGE_KEY,
        JSON.stringify({ focusKey: weakestMetricKey, focusLabel: label }),
      );
    }

    try {
      await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboardedAt: new Date().toISOString() }),
      });
    } catch {
      // Non-fatal — redirect anyway
    }

    router.push('/dashboard');
  };

  if (isProcessing || (!isDone && !isFailed)) {
    const processingStatus: ProcessingStatusProps['status'] =
      status === 'CREATED' ||
      status === 'UPLOADED' ||
      status === 'TRANSCRIBING' ||
      status === 'SCORING' ||
      status === 'ANALYZING' ||
      status === 'DONE' ||
      status === 'FAILED'
        ? status
        : 'UPLOADED';

    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
          Building your voice profile…
        </h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-sm text-sm">
          This usually takes 15–30 seconds. Hang tight!
        </p>
        <ProcessingStatus status={processingStatus} />
      </div>
    );
  }

  if (isFailed) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
          Something went wrong
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm">
          We couldn&apos;t process your recording. You can still start training — your first session will build your profile.
        </p>
        <button
          type="button"
          onClick={() => void handleStartTraining()}
          className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          Go to dashboard
        </button>
      </div>
    );
  }

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
      )}

      {focusAreas.length > 0 && (
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
      )}

      <button
        type="button"
        onClick={() => void handleStartTraining()}
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
