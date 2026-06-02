// Main recording interface — chunked AudioWorklet capture with background upload
'use client';

import { useEffect, useRef, useState } from 'react';
import { useAudioLevelMeter } from '@/components/ui/AudioLevelMeter/useAudioLevelMeter';
import { useProgressiveResults } from '@/features/recording/useProgressiveResults';
import { useRecordingPanel } from './useRecordingPanel';
import { useRecordingEffects } from './useRecordingEffects';
import { useCategorySelection } from './useCategorySelection';
import { RecordingPanelView } from './RecordingPanelView';
import type { RecordingPanelProps } from './RecordingPanel.types';

export function RecordingPanel(props: RecordingPanelProps) {
  const [showAutoSaveToast, setShowAutoSaveToast] = useState(false);
  const prevChunkIndex = useRef(0);

  const {
    recordState, recordingMode, duration, chunkIndex, mediaStream, warnings,
    isPaused, isPausedBySilence, canPause, silenceWarningActive, secondsUntilAutoStop,
    error, startWithMobilePolish, stopWithMobilePolish, pauseRecording, resumeRecording,
    isCancelModalOpen, hasCompletedChunks, sessionId,
    handleCancelPress, handleCancelModalDismiss, handleDiscardSession, handleFinishEarly,
  } = useRecordingPanel(props);

  const { activeCategory, isFreeSpeak, selectedPrompt, handleCategoryChange, handleFreeSpeakToggle } =
    useCategorySelection();

  const { warning: levelWarning } = useAudioLevelMeter({
    stream: mediaStream,
    isActive: recordState === 'recording',
  });

  useProgressiveResults({ sessionId, isRecording: recordState === 'recording', elapsedSecs: duration });
  useRecordingEffects({ recordState, isPaused, canPause, pauseRecording, resumeRecording });

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

  if (typeof window !== 'undefined' && !navigator.mediaDevices?.getUserMedia) {
    return (
      <div className="text-center py-12">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md mx-auto">
          <h3 className="text-lg font-semibold text-yellow-900 mb-2">Browser Not Supported</h3>
          <p className="text-sm text-yellow-800">
            Your browser does not support audio recording. Please use a modern browser like Chrome, Edge, Firefox, or Safari 14.1+.
          </p>
        </div>
      </div>
    );
  }

  const idleHint = recordingMode === 'hold-to-record' ? 'Hold the button while you speak' : null;
  const waveformColor = recordState === 'recording' ? 'bg-sky-400 dark:bg-sky-500' : 'bg-sky-400/70 dark:bg-sky-500/50';

  return (
    <RecordingPanelView
      recordState={recordState}
      recordingMode={recordingMode}
      duration={duration}
      mediaStream={mediaStream}
      warnings={warnings}
      isPaused={isPaused}
      isPausedBySilence={isPausedBySilence}
      canPause={canPause}
      silenceWarningActive={silenceWarningActive}
      secondsUntilAutoStop={secondsUntilAutoStop}
      error={error}
      isCancelModalOpen={isCancelModalOpen}
      hasCompletedChunks={hasCompletedChunks}
      showAutoSaveToast={showAutoSaveToast}
      levelWarning={levelWarning ?? null}
      activeCategory={activeCategory}
      isFreeSpeak={isFreeSpeak}
      selectedPrompt={selectedPrompt}
      idleHint={idleHint}
      waveformColor={waveformColor}
      onStart={isPaused ? resumeRecording : startWithMobilePolish}
      onStop={stopWithMobilePolish}
      onCancel={() => { void handleCancelPress(); }}
      onPause={pauseRecording}
      onResume={resumeRecording}
      onCategoryChange={handleCategoryChange}
      onFreeSpeakToggle={handleFreeSpeakToggle}
      onDiscard={() => { void handleDiscardSession(); }}
      onFinishEarly={() => { void handleFinishEarly(); }}
      onDismiss={handleCancelModalDismiss}
    />
  );
}
