// Main recording interface — orchestrates timer, button, and upload flow
'use client';

import { useState } from 'react';
import { useAudioRecorder } from '@/features/recording/useAudioRecorder';
import { RecordButton } from '@/components/ui/RecordButton';
import { SessionTimer } from '@/components/ui/SessionTimer';
import type { RecordingPanelProps } from './RecordingPanel.types';

export function RecordingPanel({ onUpload }: RecordingPanelProps) {
  const { state, duration, audioBlob, error, startRecording, stopRecording, resetRecording } =
    useAudioRecorder();
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async () => {
    if (!audioBlob) return;

    setIsUploading(true);
    try {
      await onUpload(audioBlob, duration);
      resetRecording();
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setIsUploading(false);
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
    <div className="flex flex-col items-center justify-center py-12 space-y-8">
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
      <div className="text-center min-h-[60px]">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {!error && state === 'idle' && (
          <p className="text-gray-600 text-lg">
            Press the button to start your speaking session
          </p>
        )}

        {!error && state === 'recording' && (
          <p className="text-gray-700 text-lg font-medium">
            Speaking... take your time
          </p>
        )}

        {!error && state === 'stopped' && !isUploading && (
          <div className="space-y-4">
            <p className="text-gray-700 text-lg font-medium">
              Session complete! Ready to upload.
            </p>
            <div className="flex space-x-4 justify-center">
              <button
                onClick={handleUpload}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Upload &amp; Analyze
              </button>
              <button
                onClick={resetRecording}
                className="px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Discard &amp; Retry
              </button>
            </div>
          </div>
        )}

        {isUploading && (
          <p className="text-blue-600 text-lg font-medium">
            Uploading... please wait
          </p>
        )}
      </div>

      {/* Audio preview */}
      {audioBlob && state === 'stopped' && !isUploading && (
        <div className="mt-4">
          <audio controls src={URL.createObjectURL(audioBlob)} className="w-80" />
        </div>
      )}
    </div>
  );
}
