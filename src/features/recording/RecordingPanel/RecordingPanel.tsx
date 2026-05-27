// Main recording interface — orchestrates timer, button, VAD validation, and upload flow
'use client';

import { useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAudioRecorder } from '@/features/recording/useAudioRecorder';
import { useSileroVad } from '@/features/recording/useSileroVad';
import { validateRecording } from '@/features/recording/validateRecording';
import { useUploadSession } from '@/features/session';
import { RecordButton } from '@/components/ui/RecordButton';
import { SessionTimer } from '@/components/ui/SessionTimer';
import { AudioLevelMeter } from '@/components/ui/AudioLevelMeter';
import type { RecordingPanelProps } from './RecordingPanel.types';

export function RecordingPanel({
  topic,
  focus,
  recordingMode = 'press-to-toggle',
}: RecordingPanelProps) {
  const router = useRouter();
  const validationRunRef = useRef<string | null>(null);

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
  } = useAudioRecorder({ recordingMode });

  const { status: vadStatus, analyzeBlob, reset: resetVad } = useSileroVad();
  const { upload, isUploading, error: uploadError } = useUploadSession();

  const isAnalyzing = vadStatus === 'loading' || vadStatus === 'running';
  const error = recordError ?? uploadError;

  const audioPreviewUrl = useMemo(() => {
    if (audioBlob) return URL.createObjectURL(audioBlob);
    return null;
  }, [audioBlob]);

  useEffect(() => {
    return () => {
      if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
    };
  }, [audioPreviewUrl]);

  // Pre-upload validation + Silero VAD pre-flight when recording stops
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

  return (
    <div className="flex flex-col items-center justify-center py-6 sm:py-12 space-y-6 sm:space-y-8">
      <div className="flex items-end gap-6">
        {state === 'recording' && (
          <AudioLevelMeter stream={mediaStream} isActive={state === 'recording'} />
        )}
        <SessionTimer seconds={duration} isActive={state === 'recording'} />
      </div>

      <RecordButton
        state={state}
        recordingMode={recordingMode}
        onStart={startRecording}
        onStop={stopRecording}
        disabled={isUploading || isAnalyzing}
      />

      <div className="text-center min-h-[60px] px-4" aria-live="polite" role="status">
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
            Speaking... take your time
          </p>
        )}

        {!error && state === 'validating' && (
          <p className="text-blue-600 dark:text-blue-400 text-base sm:text-lg font-medium">
            Checking for speech...
          </p>
        )}

        {!error && state === 'stopped' && !isUploading && (
          <div className="space-y-4">
            {vadWarning && (
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-sm text-amber-800 dark:text-amber-200">{vadWarning.message}</p>
              </div>
            )}
            <p className="text-gray-700 dark:text-gray-200 text-base sm:text-lg font-medium">
              Session complete! Ready to upload.
            </p>
            <div className="flex space-x-3 sm:space-x-4 justify-center">
              <button
                type="button"
                aria-label="Upload and analyze session"
                onClick={handleUpload}
                className="px-5 py-2.5 sm:px-6 sm:py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-black focus:ring-blue-500 transition-colors"
              >
                Upload &amp; Analyze
              </button>
              <button
                type="button"
                aria-label="Discard recording and try again"
                onClick={() => { resetRecording(); resetVad(); }}
                className="px-5 py-2.5 sm:px-6 sm:py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-black focus:ring-gray-500 transition-colors"
              >
                Discard &amp; Retry
              </button>
            </div>
          </div>
        )}

        {isUploading && (
          <p className="text-blue-600 dark:text-blue-400 text-base sm:text-lg font-medium">
            Uploading... please wait
          </p>
        )}
      </div>

      {audioPreviewUrl && state === 'stopped' && !isUploading && (
        <div className="mt-4 w-full max-w-xs sm:max-w-sm mx-auto">
          <audio
            controls
            src={audioPreviewUrl}
            className="w-full"
            aria-label="Session recording preview"
          />
        </div>
      )}
    </div>
  );
}
