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
      : null;

  const isActive = recordState === 'recording' || isPaused;
  const waveformColor = recordState === 'recording'
    ? 'bg-sky-400 dark:bg-sky-500'
    : 'bg-sky-300/50 dark:bg-sky-600/40';

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto h-full py-2">

      {/* Top — context + prompt (compact, subdued) */}
      <div className="w-full space-y-2 px-2 shrink-0">
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
          <div className="space-y-1.5">
            {warnings.map((warning) => (
              <div
                key={warning}
                className="rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
              >
                {warning}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Center stage — waveform + timer + button + controls */}
      <div className="flex flex-col items-center justify-center flex-1 min-h-0 w-full gap-4">

        {/* Large waveform — the hero */}
        <WaveformVisualizer
          stream={mediaStream}
          barColorClass={waveformColor}
          size="large"
        />

        <SessionTimer seconds={duration} isActive={recordState === 'recording' && !isPaused} />

        {/* Audio level hint */}
        <div className="h-4" aria-live="polite">
          {recordState === 'recording' && levelWarning === 'clipping' && (
            <p className="text-xs font-medium text-red-400">
              Too loud — move back
            </p>
          )}
          {showAutoSaveToast && (
            <p className="text-xs font-medium text-emerald-500">
              ✓ Progress saved
            </p>
          )}
        </div>

        <RecordButton
          state={recordState}
          recordingMode={recordingMode}
          onStart={isPaused ? resumeRecording : startWithMobilePolish}
          onStop={stopWithMobilePolish}
          disabled={recordState === 'recording' && duration < 45}
        />

        {/* Controls — Cancel / Pause / Resume */}
        {isActive && (
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => { void handleCancelPress(); }}
              aria-label="Cancel recording"
              className="flex items-center gap-1.5 rounded-full bg-zinc-100 px-5 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-400 dark:hover:bg-zinc-700/80"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </button>

            {recordState === 'recording' && (
              <button
                type="button"
                onClick={pauseRecording}
                disabled={!canPause}
                aria-label="Pause recording"
                className="flex items-center gap-1.5 rounded-full bg-zinc-100 px-5 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-800/80 dark:text-zinc-400 dark:hover:bg-zinc-700/80"
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
                className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-5 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="h-4 w-4">
                  <path d="M8 5.14v14l11-7-11-7z" />
                </svg>
                Resume
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottom — status only */}
      <div className="w-full shrink-0 space-y-3 px-2 pb-2">

        {/* Silence auto-stop warning */}
        {silenceWarningActive && secondsUntilAutoStop !== null && (
          <div className="rounded-lg bg-red-500/10 px-4 py-2 text-center">
            <p className="text-sm font-medium text-red-600 dark:text-red-400">
              Ending in {secondsUntilAutoStop}s — speak to continue
            </p>
          </div>
        )}

        {/* Status messages */}
        <div className="text-center min-h-6" aria-live="polite" role="status">
          {error && (
            <div className="rounded-lg bg-red-500/10 p-2.5">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {!error && recordState === 'idle' && idleHint !== null && (
            <p className="text-zinc-400 dark:text-zinc-500 text-sm">{idleHint}</p>
          )}

          {!error && recordState === 'recording' && isPausedBySilence && !silenceWarningActive && (
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
              Paused — no speech detected
            </p>
          )}

          {!error && isPaused && (
            <p className="text-emerald-600 dark:text-emerald-400 text-sm font-medium">
              Paused — tap Resume to continue
            </p>
          )}

          {!error && recordState === 'stopped' && (
            <p className="text-sky-600 dark:text-sky-400 text-sm font-medium">
              Finalizing session...
            </p>
          )}
        </div>
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
