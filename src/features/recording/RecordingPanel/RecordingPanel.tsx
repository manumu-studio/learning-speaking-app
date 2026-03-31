// Main recording interface — orchestrates timer, button, and upload flow
'use client';

import { useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAudioRecorder } from '@/features/recording/useAudioRecorder';
import { useUploadSession } from '@/features/session';
import { RecordButton } from '@/components/ui/RecordButton';
import { SessionTimer } from '@/components/ui/SessionTimer';
import type { RecordingPanelProps } from './RecordingPanel.types';

export function RecordingPanel({ topic }: RecordingPanelProps) {
  const router = useRouter();
  const { state, duration, audioBlob, error: recordError, startRecording, stopRecording, resetRecording } =
    useAudioRecorder();
  const { upload, isUploading, error: uploadError } = useUploadSession();

  // Combined error from either recording or upload
  const error = recordError ?? uploadError;

  // Create stable Object URL from audio blob — revoke on cleanup to prevent memory leak
  const audioPreviewUrl = useMemo(() => {
    if (audioBlob) return URL.createObjectURL(audioBlob);
    return null;
  }, [audioBlob]);

  useEffect(() => {
    return () => {
      if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
    };
  }, [audioPreviewUrl]);

  const handleUpload = async () => {
    if (!audioBlob) return;

    try {
      const sessionId = await upload(audioBlob, duration, topic);
      router.push(`/session/${sessionId}`);
    } catch {
      // Error displayed via uploadError state from the hook
    }
  };

  // Browser compatibility check
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

  return (
    <div className="flex flex-col items-center justify-center py-6 sm:py-12 space-y-6 sm:space-y-8">
      {/* Timer */}
      <SessionTimer seconds={duration} isActive={state === 'recording'} />

      {/* Record Button */}
      <RecordButton
        state={state}
        onStart={startRecording}
        onStop={stopRecording}
        disabled={isUploading}
      />

      {/* Status Messages */}
      <div className="text-center min-h-[60px] px-4">
        {error && (
          <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg p-4 max-w-md">
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        {!error && state === 'idle' && (
          <p className="text-gray-500 dark:text-gray-400 text-base sm:text-lg">
            Press the button to start your speaking session
          </p>
        )}

        {!error && state === 'recording' && (
          <p className="text-gray-700 dark:text-gray-200 text-base sm:text-lg font-medium">
            Speaking... take your time
          </p>
        )}

        {!error && state === 'stopped' && !isUploading && (
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-200 text-base sm:text-lg font-medium">
              Session complete! Ready to upload.
            </p>
            <div className="flex space-x-3 sm:space-x-4 justify-center">
              <button
                onClick={handleUpload}
                className="px-5 py-2.5 sm:px-6 sm:py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-black focus:ring-blue-500 transition-colors"
              >
                Upload &amp; Analyze
              </button>
              <button
                onClick={resetRecording}
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

      {/* Audio preview */}
      {audioPreviewUrl && state === 'stopped' && !isUploading && (
        <div className="mt-4 w-full max-w-xs sm:max-w-sm mx-auto">
          <audio controls src={audioPreviewUrl} className="w-full" />
        </div>
      )}
    </div>
  );
}
