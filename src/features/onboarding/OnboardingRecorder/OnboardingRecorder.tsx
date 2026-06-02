// Simplified recording panel for the onboarding placement test
'use client';

import { RecordButton } from '@/components/ui/RecordButton';
import { SessionTimer } from '@/components/ui/SessionTimer';
import { AudioLevelMeter } from '@/components/ui/AudioLevelMeter';
import { WaveformVisualizer } from '@/features/recording/WaveformVisualizer';
import { AudioPreviewPanel } from '@/features/recording/AudioPreviewPanel';
import { RecorderStatusMessage } from './RecorderStatusMessage';
import { useOnboardingRecorderState } from './useOnboardingRecorderState';
import type { OnboardingRecorderProps } from './OnboardingRecorder.types';

const MAX_DURATION_SECS = 60;

export function OnboardingRecorder({ onComplete }: OnboardingRecorderProps) {
  const {
    uiState,
    duration,
    mediaStream,
    audioPreviewUrl,
    vadWarning,
    isPausedBySilence,
    isUploading,
    isAnalyzing,
    error,
    startWithMobilePolish,
    stopWithMobilePolish,
    handleUpload,
    resetSession,
  } = useOnboardingRecorderState(onComplete);

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <div className="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
        Speak for{' '}
        <span className="font-semibold text-gray-700 dark:text-gray-200">30–60 seconds</span>.
        The timer stops automatically at 60s.
      </div>

      <div className="flex items-end justify-center gap-4 w-full">
        {uiState === 'recording' && (
          <AudioLevelMeter stream={mediaStream} isActive={uiState === 'recording'} />
        )}
        <SessionTimer
          seconds={duration}
          isActive={uiState === 'recording'}
          limitSecs={MAX_DURATION_SECS}
        />
      </div>

      <div className="flex w-full flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <WaveformVisualizer stream={mediaStream} />
        <RecordButton
          state={uiState}
          recordingMode="press-to-toggle"
          onStart={startWithMobilePolish}
          onStop={stopWithMobilePolish}
          disabled={isUploading || isAnalyzing}
        />
      </div>

      <RecorderStatusMessage
        uiState={uiState}
        error={error}
        isPausedBySilence={isPausedBySilence}
        isUploading={isUploading}
      />

      {audioPreviewUrl !== null && uiState === 'stopped' && (
        <AudioPreviewPanel
          audioPreviewUrl={audioPreviewUrl}
          vadWarning={vadWarning}
          isUploading={isUploading}
          onSubmit={handleUpload}
          onTryAgain={resetSession}
          onDiscard={resetSession}
        />
      )}
    </div>
  );
}
