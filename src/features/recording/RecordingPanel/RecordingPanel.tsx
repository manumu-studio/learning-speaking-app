// Main recording interface — VAD validation, auto-segmentation, and upload flow
'use client';

import { useMemo, useEffect, useRef, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAudioRecorder } from '@/features/recording/useAudioRecorder';
import { useSileroVad } from '@/features/recording/useSileroVad';
import { useSegmentUploader } from '@/features/recording/useSegmentUploader';
import { validateRecording } from '@/features/recording/validateRecording';
import { useUploadSession } from '@/features/session';
import { RecordButton } from '@/components/ui/RecordButton';
import { SessionTimer } from '@/components/ui/SessionTimer';
import { AudioLevelMeter } from '@/components/ui/AudioLevelMeter';
import { WaveformVisualizer } from '@/features/recording/WaveformVisualizer';
import { PromptCard } from '@/features/recording/PromptCard';
import {
  pickRandomPrompt,
  type PromptCategory,
  type SpeakingPrompt,
} from '@/features/recording/prompts.config';
import { TimeLimitSelector } from '@/features/recording/TimeLimitSelector';
import type { TimeLimitOption } from '@/features/recording/TimeLimitSelector';
import { AudioPreviewPanel } from '@/features/recording/AudioPreviewPanel';
import {
  RecordingContext,
  useRecordingContext,
} from '@/features/recording/RecordingContext';
import { useMobileRecording } from '@/features/recording/useMobileRecording';
import type { RecordingPanelProps } from './RecordingPanel.types';

const SEGMENT_STATUS_CLASSES = {
  completed:
    'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
  uploading:
    'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
  failed:
    'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
} as const;

export function RecordingPanel({
  topic,
  focus,
  recordingMode = 'press-to-toggle',
}: RecordingPanelProps) {
  const router = useRouter();
  const validationRunRef = useRef<string | null>(null);
  const [mobileError, setMobileError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<PromptCategory>('daily');
  const [isFreeSpeak, setIsFreeSpeak] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<SpeakingPrompt | null>(() =>
    pickRandomPrompt('daily'),
  );
  const [timeLimit, setTimeLimit] = useState<TimeLimitOption>(null);

  const {
    todaySessionCount,
    nextRecordingNumber,
    isLoading: isContextLoading,
  } = useRecordingContext();

  const { segments, uploadSegment, isUploading: isSegmentUploading } =
    useSegmentUploader({ topic, focus });
  const { upload, isUploading: isFinalUploading, error: uploadError } = useUploadSession();

  const handleSegmentReady = useCallback(
    (blob: Blob, segmentDuration: number, segmentIndex: number) => {
      uploadSegment(blob, segmentDuration, segmentIndex);
    },
    [uploadSegment],
  );

  const {
    state,
    duration,
    audioBlob,
    mimeType,
    mediaStream,
    vadWarning,
    error: recordError,
    startRecording,
    stopRecording,
    completeValidation,
    failValidation,
    resetRecording,
    segmentIndex,
    secondsUntilSplit,
    timeLimitSecs,
  } = useAudioRecorder({
    recordingMode,
    maxDurationSecs: 300,
    timeLimitSecs: timeLimit,
    onSegmentReady: handleSegmentReady,
    warningBeforeSplitSecs: 30,
  });

  const { startWithMobilePolish, stopWithMobilePolish } = useMobileRecording({
    isRecording: state === 'recording',
    mediaStream,
    startRecording,
    stopRecording,
    onInterrupted: setMobileError,
  });

  const { status: vadStatus, analyzeBlob, reset: resetVad } = useSileroVad();

  const isAnalyzing = vadStatus === 'loading' || vadStatus === 'running';
  const error = recordError ?? uploadError ?? mobileError;
  const isUploading = isFinalUploading || isSegmentUploading;

  const audioPreviewUrl = useMemo(() => {
    if (audioBlob) return URL.createObjectURL(audioBlob);
    return null;
  }, [audioBlob]);

  useEffect(() => {
    return () => {
      if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
    };
  }, [audioPreviewUrl]);

  useEffect(() => {
    if (state !== 'validating' || !audioBlob || !mimeType) return;

    const runKey = `${audioBlob.size}-${duration}`;
    if (validationRunRef.current === runKey) return;
    validationRunRef.current = runKey;

    const runValidation = async () => {
      const validation = validateRecording({
        durationSeconds: duration,
        blob: audioBlob,
        mimeType,
      });

      if (!validation.valid) {
        failValidation(validation.message);
        return;
      }

      const vadResult = await analyzeBlob(audioBlob);

      if (vadResult.outcome === 'no-speech') {
        failValidation(vadResult.message);
        return;
      }

      if (vadResult.outcome === 'error') {
        completeValidation(null);
        return;
      }

      if (vadResult.outcome === 'multi-voice') {
        completeValidation({
          message: vadResult.message,
          canProceed: true,
        });
        return;
      }

      completeValidation(null);
    };

    void runValidation();
  }, [
    state,
    audioBlob,
    mimeType,
    duration,
    analyzeBlob,
    completeValidation,
    failValidation,
  ]);

  const handleUpload = async () => {
    if (!audioBlob) return;

    try {
      const sessionId = await upload(audioBlob, duration, topic, focus);
      router.push(`/session/${sessionId}`);
    } catch {
      // Error displayed via uploadError state from the hook
    }
  };

  const resetSession = useCallback(() => {
    resetRecording();
    resetVad();
    validationRunRef.current = null;
    setMobileError(null);
  }, [resetRecording, resetVad]);

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
      : 'Press the button to start your speaking session';

  const recordingStatusMessage = (() => {
    if (segmentIndex > 0) {
      return `Segment ${segmentIndex + 1} — previous segment uploading...`;
    }
    return 'Speaking... segment will save automatically at 5:00';
  })();

  const timerLimitSecs =
    timeLimitSecs !== null ? timeLimitSecs : undefined;

  return (
    <div className="flex flex-col items-center justify-center py-6 sm:py-12 space-y-6 sm:space-y-8 w-full max-w-md mx-auto px-4">
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

      {state === 'idle' && (
        <TimeLimitSelector
          selected={timeLimit}
          onChange={setTimeLimit}
          disabled={false}
        />
      )}

      {secondsUntilSplit !== null && (
        <div className="w-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-2 text-sm text-amber-800 dark:text-amber-200 transition-all">
          Wrapping up in {secondsUntilSplit}s — a new segment will start automatically
        </div>
      )}

      <div className="flex w-full items-end justify-center gap-4 sm:gap-6">
        {state === 'recording' && (
          <AudioLevelMeter stream={mediaStream} isActive={state === 'recording'} />
        )}
        <SessionTimer
          seconds={duration}
          isActive={state === 'recording'}
          {...(timerLimitSecs !== undefined ? { limitSecs: timerLimitSecs } : {})}
        />
        {segmentIndex > 0 && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 animate-pulse">
            Segment {segmentIndex + 1}
          </span>
        )}
      </div>

      {segments.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center w-full">
          {segments.map((seg) => (
            <span
              key={seg.segmentIndex}
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${SEGMENT_STATUS_CLASSES[seg.status]}`}
            >
              {seg.status === 'completed' && `Seg ${seg.segmentIndex + 1} ✓`}
              {seg.status === 'uploading' && `Seg ${seg.segmentIndex + 1} ↑`}
              {seg.status === 'failed' && `Seg ${seg.segmentIndex + 1} ✗`}
            </span>
          ))}
        </div>
      )}

      <div className="flex w-full flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <WaveformVisualizer stream={mediaStream} />
        <RecordButton
          state={state}
          recordingMode={recordingMode}
          onStart={startWithMobilePolish}
          onStop={stopWithMobilePolish}
          disabled={isUploading || isAnalyzing}
        />
      </div>

      <div className="text-center min-h-[60px] w-full" aria-live="polite" role="status">
        {error && (
          <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        {!error && state === 'idle' && (
          <p className="text-gray-500 dark:text-gray-400 text-base sm:text-lg">{idleHint}</p>
        )}

        {!error && state === 'recording' && (
          <p className="text-gray-700 dark:text-gray-200 text-base sm:text-lg font-medium">
            {recordingStatusMessage}
          </p>
        )}

        {!error && state === 'validating' && (
          <p className="text-blue-600 dark:text-blue-400 text-base sm:text-lg font-medium">
            Checking for speech...
          </p>
        )}

        {isUploading && state === 'stopped' && (
          <p className="text-blue-600 dark:text-blue-400 text-base sm:text-lg font-medium">
            Uploading... please wait
          </p>
        )}
      </div>

      {audioPreviewUrl && state === 'stopped' && (
        <AudioPreviewPanel
          audioPreviewUrl={audioPreviewUrl}
          vadWarning={vadWarning}
          isUploading={isUploading}
          onSubmit={() => void handleUpload()}
          onTryAgain={resetSession}
          onDiscard={() => {
            resetSession();
            router.push('/dashboard');
          }}
        />
      )}
    </div>
  );
}
