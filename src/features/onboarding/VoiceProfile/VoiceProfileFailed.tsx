// Error state shown when the onboarding session processing failed
'use client';

interface VoiceProfileFailedProps {
  onStartTraining: () => void;
}

export function VoiceProfileFailed({ onStartTraining }: VoiceProfileFailedProps) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
        Something went wrong
      </h2>
      <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm">
        We couldn&apos;t process your recording. You can still start training — your first session
        will build your profile.
      </p>
      <button
        type="button"
        onClick={onStartTraining}
        className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
      >
        Go to dashboard
      </button>
    </div>
  );
}
