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
  const [isFreeSpeak, setIsFreeSpeak] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<SpeakingPrompt | null>(() =>
    pickRandomPrompt('daily'),
  );

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
    isPausedBySilence,
    error,
    startWithMobilePolish,
    stopWithMobilePolish,
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

  const { completedChunks } = useProgressiveResults({
    sessionId,
    isRecording: recordState === 'recording',
    elapsedSecs: duration,
  });

  const [showAutoSaveToast, setShowAutoSaveToast] = useState(false);
  const prevChunkIndex = useRef(chunkIndex);
  useEffect(() => {
    if (chunkIndex > prevChunkIndex.current && recordState === 'recording') {
      const timer = setTimeout(() => setShowAutoSaveToast(false), 3000);
      prevChunkIndex.current = chunkIndex;
      // Deferred to avoid synchronous setState in effect body
      queueMicrotask(() => setShowAutoSaveToast(true));
      return () => clearTimeout(timer);
    }
    prevChunkIndex.current = chunkIndex;
    return undefined;
  }, [chunkIndex, recordState]);

  const handleShufflePrompt = useCallback(() => {
    setSelectedPrompt((current) =>
      pickRandomPrompt(activeCategory, current?.id),
    );
  }, [activeCategory]);

  const handleCategoryChange = useCallback((category: PromptCategory) => {
    setActiveCategory(category);
    setIsFreeSpeak(false);
    setSelectedPrompt(pickRandomPrompt(category));
  }, []);

  const handleFreeSpeakToggle = useCallback(() => {
    setIsFreeSpeak((prev) => !prev);
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
    <div className="flex flex-col items-center justify-center py-4 sm:py-12 space-y-4 sm:space-y-8 w-full max-w-md mx-auto px-4 min-h-[calc(100vh-8rem)] sm:min-h-0">
      <RecordingContext
        todaySessionCount={todaySessionCount}
        nextRecordingNumber={nextRecordingNumber}
        isLoading={isContextLoading}
      />

      <PromptCard
        prompt={isFreeSpeak ? null : selectedPrompt}
        activeCategory={activeCategory}
        onShuffle={handleShufflePrompt}
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
        <SessionTimer seconds={duration} isActive={recordState === 'recording'} />
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

      <div className="flex w-full flex-col items-center gap-4 sm:flex-row sm:justify-center flex-1 justify-center">
        <WaveformVisualizer stream={mediaStream} />
        <RecordButton
          state={recordState}
          recordingMode={recordingMode}
          onStart={startWithMobilePolish}
          onStop={stopWithMobilePolish}
          disabled={recordState === 'recording' && duration < 45}
        />
      </div>

      {completedChunks.length > 0 && (
        <div className="mt-4 w-full rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-800 dark:text-blue-300">
            Results building up
          </p>
          <ul className="space-y-2">
            {completedChunks.map((chunk) => (
              <li key={chunk.chunkIndex} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 shrink-0 text-green-500" aria-hidden="true">&#10003;</span>
                <div>
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    Segment {chunk.chunkIndex + 1}
                  </span>
                  {chunk.transcriptSnippet && (
                    <p className="mt-0.5 text-xs italic text-gray-600 dark:text-gray-400">
                      &ldquo;{chunk.transcriptSnippet}&rdquo;
                    </p>
                  )}
                  {chunk.pronScore !== null && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Pronunciation: {Math.round(chunk.pronScore)}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {recordState === 'recording' && (
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

      <div className="text-center min-h-[60px] w-full" aria-live="polite" role="status">
        {error && (
          <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        {!error && recordState === 'idle' && (
          <p className="text-gray-500 dark:text-gray-400 text-base sm:text-lg">{idleHint}</p>
        )}

        {!error && recordState === 'recording' && !isPausedBySilence && (
          <p className="text-gray-700 dark:text-gray-200 text-base sm:text-lg font-medium">
            Speaking... chunks upload automatically every 2 minutes
          </p>
        )}

        {!error && recordState === 'recording' && isPausedBySilence && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/50">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Paused — waiting for you to speak
            </p>
          </div>
        )}

        {!error && recordState === 'stopped' && (
          <p className="text-blue-600 dark:text-blue-400 text-base sm:text-lg font-medium">
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
