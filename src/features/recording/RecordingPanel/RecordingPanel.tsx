// Main recording interface — chunked AudioWorklet capture with background upload
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RecordButton } from '@/components/ui/RecordButton';
import { SessionTimer } from '@/components/ui/SessionTimer';
import { useAudioLevelMeter } from '@/components/ui/AudioLevelMeter/useAudioLevelMeter';
import { WaveformVisualizer } from '@/features/recording/WaveformVisualizer';
import { PromptCard } from '@/features/recording/PromptCard';
import {
  pickRandomPrompt,
  type PromptCategory,
  type SpeakingPrompt,
} from '@/features/recording/prompts.config';
import {
  RecordingContext,
  useRecordingContext,
} from '@/features/recording/RecordingContext';
import { CancelRecordingModal } from '@/components/ui/CancelRecordingModal';
import { useProgressiveResults } from '@/features/recording/useProgressiveResults';
import { useRecordingPanel } from './useRecordingPanel';
import type { RecordingPanelProps } from './RecordingPanel.types';

export function RecordingPanel(props: RecordingPanelProps) {
  const [activeCategory, setActiveCategory] = useState<PromptCategory>('daily');
  const [isFreeSpeak, setIsFreeSpeak] = useState(true);
  const [selectedPrompt, setSelectedPrompt] = useState<SpeakingPrompt | null>(null);

  const {
    todaySessionCount,
    nextRecordingNumber,
    isLoading: isContextLoading,
  } = useRecordingContext();

  const {
    recordState,
    recordingMode,
    duration,
    chunkIndex,
    mediaStream,
    warnings,
    isPaused,
    isPausedBySilence,
    canPause,
    silenceWarningActive,
    secondsUntilAutoStop,
    error,
    startWithMobilePolish,
    stopWithMobilePolish,
    pauseRecording,
    resumeRecording,
    isCancelModalOpen,
    hasCompletedChunks,
    sessionId,
    handleCancelPress,
    handleCancelModalDismiss,
    handleDiscardSession,
    handleFinishEarly,
  } = useRecordingPanel(props);

  const { warning: levelWarning } = useAudioLevelMeter({
    stream: mediaStream,
    isActive: recordState === 'recording',
  });

  useProgressiveResults({
    sessionId,
    isRecording: recordState === 'recording',
    elapsedSecs: duration,
  });

  // Auto-save toast (triggered when a new chunk completes)
  const [showAutoSaveToast, setShowAutoSaveToast] = useState(false);
  const prevChunkIndex = useRef(chunkIndex);
  useEffect(() => {
    if (chunkIndex > prevChunkIndex.current && recordState === 'recording') {
      const timer = setTimeout(() => setShowAutoSaveToast(false), 3000);
      prevChunkIndex.current = chunkIndex;
      queueMicrotask(() => setShowAutoSaveToast(true));
      return () => clearTimeout(timer);
    }
    prevChunkIndex.current = chunkIndex;
    return undefined;
  }, [chunkIndex, recordState]);

  // Wake Lock — prevent screen from dimming during recording
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  useEffect(() => {
    if (recordState !== 'recording' && !isPaused) {
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
      return;
    }
    if (recordState === 'recording' && 'wakeLock' in navigator) {
      navigator.wakeLock.request('screen').then(
        (lock) => { wakeLockRef.current = lock; },
        () => {},
      );
    }
    return () => {
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    };
  }, [recordState, isPaused]);

  // Media Session API — AirPods / headphone play/pause control
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    if (recordState === 'recording' || isPaused) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: 'Recording workout',
        artist: 'Learning Speaking App',
      });
      navigator.mediaSession.playbackState = isPaused ? 'paused' : 'playing';

      const handlePlay = () => { if (isPaused) resumeRecording(); };
      const handlePause = () => { if (recordState === 'recording' && canPause) pauseRecording(); };

      navigator.mediaSession.setActionHandler('play', handlePlay);
      navigator.mediaSession.setActionHandler('pause', handlePause);

      return () => {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.playbackState = 'none';
      };
    }
    return undefined;
  }, [recordState, isPaused, canPause, pauseRecording, resumeRecording]);

  const handleCategoryChange = useCallback((category: PromptCategory) => {
    setActiveCategory(category);
    setIsFreeSpeak(false);
    setSelectedPrompt(pickRandomPrompt(category));
  }, []);

  const handleFreeSpeakToggle = useCallback(() => {
    setIsFreeSpeak((prev) => {
      if (prev) return prev;
      setSelectedPrompt(null);
      return true;
    });
  }, []);

  if (typeof window !== 'undefined' && !navigator.mediaDevices?.getUserMedia) {
    return (
      <div className="text-center py-12">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md mx-auto">
          <h3 className="text-lg font-semibold text-yellow-900 mb-2">
            Browser Not Supported
          </h3>
          <p className="text-sm text-yellow-800">
            Your browser does not support audio recording. Please use a modern
            browser like Chrome, Edge, Firefox, or Safari 14.1+.
          </p>
        </div>
      </div>
    );
  }

  const idleHint =
    recordingMode === 'hold-to-record'
      ? 'Hold the button while you speak'
      : 'Press the button to start — no time limit';

  return (
    <div className="flex flex-col items-center justify-center py-2 sm:py-6 space-y-3 sm:space-y-5 w-full max-w-md mx-auto px-4">
      <RecordingContext
        todaySessionCount={todaySessionCount}
        nextRecordingNumber={nextRecordingNumber}
        isLoading={isContextLoading}
      />

      <PromptCard
        prompt={isFreeSpeak ? null : selectedPrompt}
        activeCategory={activeCategory}
        onCategoryChange={handleCategoryChange}
        onFreeSpeakToggle={handleFreeSpeakToggle}
        isFreeSpeak={isFreeSpeak}
      />

      {warnings.length > 0 && (
        <div className="w-full space-y-2">
          {warnings.map((warning) => (
            <div
              key={warning}
              className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200"
            >
              {warning}
            </div>
          ))}
        </div>
      )}

      <div className="relative flex w-full items-end justify-center gap-4 sm:gap-6">
        <SessionTimer seconds={duration} isActive={recordState === 'recording' && !isPaused} />
        <div className="h-6" aria-live="polite">
          {recordState === 'recording' && levelWarning === 'too_quiet' && (
            <p className="animate-pulse text-xs font-medium text-amber-600 dark:text-amber-400">
              Too quiet — speak up
            </p>
          )}
          {recordState === 'recording' && levelWarning === 'clipping' && (
            <p className="text-xs font-medium text-red-600 dark:text-red-400">
              Too loud — move back
            </p>
          )}
        </div>
      </div>

      {showAutoSaveToast && (
        <div className="animate-fade-in-out rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300">
          ✓ Progress saved
        </div>
      )}

      <div className="flex w-full flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <WaveformVisualizer stream={mediaStream} />
        <div className="flex flex-col items-center gap-3">
          <RecordButton
            state={recordState}
            recordingMode={recordingMode}
            onStart={isPaused ? resumeRecording : startWithMobilePolish}
            onStop={stopWithMobilePolish}
            disabled={recordState === 'recording' && duration < 45}
          />
          {recordState === 'recording' && (
            <button
              type="button"
              onClick={pauseRecording}
              disabled={!canPause}
              aria-label="Pause recording"
              className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="h-4 w-4">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
              Pause
            </button>
          )}
          {isPaused && (
            <button
              type="button"
              onClick={resumeRecording}
              aria-label="Resume recording"
              className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-emerald-600 transition-colors hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="h-4 w-4">
                <path d="M8 5.14v14l11-7-11-7z" />
              </svg>
              Resume
            </button>
          )}
        </div>
      </div>

      {silenceWarningActive && secondsUntilAutoStop !== null && (
        <div className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center dark:border-red-800 dark:bg-red-950/50">
          <p className="text-sm font-medium text-red-800 dark:text-red-200">
            Recording will end in {secondsUntilAutoStop} seconds
          </p>
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
            Speak to continue recording
          </p>
        </div>
      )}

      {(recordState === 'recording' || isPaused) && (
        <button
          type="button"
          onClick={() => {
            void handleCancelPress();
          }}
          aria-label="Cancel recording"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:border-zinc-700 dark:text-gray-400 dark:hover:bg-zinc-800"
        >
          Cancel
        </button>
      )}

      <div className="text-center min-h-10 w-full" aria-live="polite" role="status">
        {error && (
          <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg p-3 max-w-md mx-auto">
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        {!error && recordState === 'idle' && (
          <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">{idleHint}</p>
        )}

        {!error && recordState === 'recording' && isPausedBySilence && !silenceWarningActive && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 dark:border-amber-800 dark:bg-amber-950/50">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Paused — no speech detected
            </p>
          </div>
        )}

        {!error && isPaused && (
          <p className="text-emerald-600 dark:text-emerald-400 text-sm sm:text-base font-medium">
            Tap to resume recording
          </p>
        )}

        {!error && recordState === 'stopped' && (
          <p className="text-blue-600 dark:text-blue-400 text-sm sm:text-base font-medium">
            Finalizing session...
          </p>
        )}
      </div>

      <CancelRecordingModal
        isOpen={isCancelModalOpen}
        durationSecs={duration}
        hasCompletedChunks={hasCompletedChunks}
        onDiscard={() => {
          void handleDiscardSession();
        }}
        onFinishEarly={() => {
          void handleFinishEarly();
        }}
        onDismiss={handleCancelModalDismiss}
      />
    </div>
  );
}
