# PACKET-05 — Recording UI with MediaRecorder

**Branch**: `feature/recording-ui`
**Version**: `0.5.0`
**Prerequisites**:
- PACKET-04 complete (app shell + protected layout)
- Modern browser with MediaRecorder API support (Chrome, Edge, Firefox, Safari 14.1+)
- User microphone access permission

---

## What to Build

### 1. Create the audio recorder hook

**File**: `src/features/recording/useAudioRecorder.ts`

```typescript
// Custom hook for managing audio recording via MediaRecorder API
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

type RecordingState = 'idle' | 'recording' | 'stopped';

interface UseAudioRecorderReturn {
  state: RecordingState;
  duration: number; // seconds elapsed
  audioBlob: Blob | null; // recorded audio
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  resetRecording: () => void;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [state, setState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setAudioBlob(null);
      chunksRef.current = [];
      setDuration(0);

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });
      streamRef.current = stream;

      // Determine best supported MIME type
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
      ];
      const mimeType = mimeTypes.find((type) =>
        MediaRecorder.isTypeSupported(type)
      );

      if (!mimeType) {
        throw new Error('No supported audio MIME type found');
      }

      // Initialize MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setState('stopped');

        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.onerror = (event) => {
        setError('Recording error occurred');
        setState('idle');
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      setState('recording');

      // Start duration timer
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Microphone access denied. Please allow microphone access.');
        } else if (err.name === 'NotFoundError') {
          setError('No microphone found. Please connect a microphone.');
        } else {
          setError(`Failed to start recording: ${err.message}`);
        }
      } else {
        setError('Failed to start recording');
      }
      setState('idle');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.stop();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [state]);

  const resetRecording = useCallback(() => {
    setState('idle');
    setDuration(0);
    setAudioBlob(null);
    setError(null);
    chunksRef.current = [];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return {
    state,
    duration,
    audioBlob,
    error,
    startRecording,
    stopRecording,
    resetRecording,
  };
}
```

### 2. Create the RecordButton component

**Directory**: `src/components/ui/RecordButton/`

**File**: `RecordButton.tsx`

```typescript
// Large prominent record/stop button with visual state changes
'use client';

import type { RecordButtonProps } from './RecordButton.types';

export function RecordButton({
  state,
  onStart,
  onStop,
  disabled = false,
}: RecordButtonProps) {
  const handleClick = () => {
    if (state === 'idle') {
      onStart();
    } else if (state === 'recording') {
      onStop();
    }
  };

  const isIdle = state === 'idle';
  const isRecording = state === 'recording';
  const isStopped = state === 'stopped';

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isStopped}
      className={`
        relative flex flex-col items-center justify-center
        w-48 h-48 rounded-full transition-all duration-200
        focus:outline-none focus:ring-4 focus:ring-offset-2
        ${
          isIdle
            ? 'bg-green-500 hover:bg-green-600 focus:ring-green-500'
            : ''
        }
        ${isRecording ? 'bg-red-500 hover:bg-red-600 focus:ring-red-500 animate-pulse' : ''}
        ${isStopped ? 'bg-gray-400 cursor-not-allowed' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {/* Icon */}
      <div className="text-white text-5xl mb-2">
        {isIdle && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-16 h-16"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
            />
          </svg>
        )}
        {isRecording && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            viewBox="0 0 24 24"
            className="w-16 h-16"
          >
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        )}
        {isStopped && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-16 h-16"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )}
      </div>

      {/* Label */}
      <span className="text-white font-medium text-sm text-center px-4">
        {isIdle && 'Start Speaking Session'}
        {isRecording && 'Stop Session'}
        {isStopped && 'Session Complete'}
      </span>
    </button>
  );
}
```

**File**: `RecordButton.types.ts`

```typescript
// RecordButton component prop types
type RecordingState = 'idle' | 'recording' | 'stopped';

export interface RecordButtonProps {
  state: RecordingState;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
}
```

**File**: `index.ts`

```typescript
export { RecordButton } from './RecordButton';
export type { RecordButtonProps } from './RecordButton.types';
```

### 3. Create the SessionTimer component

**Directory**: `src/components/ui/SessionTimer/`

**File**: `SessionTimer.tsx`

```typescript
// Displays elapsed recording time in MM:SS format
'use client';

import type { SessionTimerProps } from './SessionTimer.types';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function SessionTimer({ seconds, isActive }: SessionTimerProps) {
  return (
    <div
      className={`text-6xl font-mono font-bold transition-colors ${
        isActive ? 'text-red-600' : 'text-gray-700'
      }`}
    >
      {formatTime(seconds)}
    </div>
  );
}
```

**File**: `SessionTimer.types.ts`

```typescript
// SessionTimer component prop types
export interface SessionTimerProps {
  seconds: number;
  isActive: boolean;
}
```

**File**: `index.ts`

```typescript
export { SessionTimer } from './SessionTimer';
export type { SessionTimerProps } from './SessionTimer.types';
```

### 4. Create the RecordingPanel component

**Directory**: `src/features/recording/RecordingPanel/`

**File**: `RecordingPanel.tsx`

```typescript
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
                Upload & Analyze
              </button>
              <button
                onClick={resetRecording}
                className="px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Discard & Retry
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

      {/* Audio preview (optional, for debugging) */}
      {audioBlob && state === 'stopped' && !isUploading && (
        <div className="mt-4">
          <audio controls src={URL.createObjectURL(audioBlob)} className="w-80" />
        </div>
      )}
    </div>
  );
}
```

**File**: `RecordingPanel.types.ts`

```typescript
// RecordingPanel component prop types
export interface RecordingPanelProps {
  onUpload: (blob: Blob, durationSecs: number) => Promise<void>;
}
```

**File**: `index.ts`

```typescript
export { RecordingPanel } from './RecordingPanel';
export type { RecordingPanelProps } from './RecordingPanel.types';
```

### 5. Update the New Session page

**File**: `src/app/(app)/session/new/page.tsx`

```typescript
// New recording session page with full recording UI
'use client';

import { Container } from '@/components/ui/Container';
import { RecordingPanel } from '@/features/recording/RecordingPanel';

export default function NewSessionPage() {
  const handleUpload = async (blob: Blob, durationSecs: number) => {
    console.log('Upload triggered:', {
      size: blob.size,
      type: blob.type,
      duration: durationSecs,
    });
    // Placeholder for PACKET-06 implementation
    alert('Upload functionality will be implemented in PACKET-06');
  };

  return (
    <Container>
      <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
        New Speaking Session
      </h1>
      <RecordingPanel onUpload={handleUpload} />
    </Container>
  );
}
```

---

## Files to Create/Modify

| File | Purpose |
|------|---------|
| `src/features/recording/useAudioRecorder.ts` | MediaRecorder hook for audio capture |
| `src/components/ui/RecordButton/RecordButton.tsx` | Record/stop button with visual states |
| `src/components/ui/RecordButton/RecordButton.types.ts` | RecordButton prop types |
| `src/components/ui/RecordButton/index.ts` | Barrel export |
| `src/components/ui/SessionTimer/SessionTimer.tsx` | MM:SS elapsed time display |
| `src/components/ui/SessionTimer/SessionTimer.types.ts` | SessionTimer prop types |
| `src/components/ui/SessionTimer/index.ts` | Barrel export |
| `src/features/recording/RecordingPanel/RecordingPanel.tsx` | Main recording UI orchestrator |
| `src/features/recording/RecordingPanel/RecordingPanel.types.ts` | RecordingPanel prop types |
| `src/features/recording/RecordingPanel/index.ts` | Barrel export |
| `src/app/(app)/session/new/page.tsx` | Updated with RecordingPanel integration |

---

## Definition of Done

- [ ] `npx tsc --noEmit` passes with no errors
- [ ] `npm run build` succeeds
- [ ] Clicking "Start" requests microphone permission
- [ ] Timer counts up during recording (increments every second)
- [ ] Button visually changes between idle/recording/stopped states
- [ ] Button shows pulsing animation when recording
- [ ] Clicking "Stop" ends recording and produces a Blob
- [ ] Audio preview player shows after recording stops
- [ ] Shows error message if microphone access is denied
- [ ] Shows error message if no microphone is detected
- [ ] Shows warning if browser doesn't support MediaRecorder API
- [ ] "Upload & Analyze" button triggers placeholder callback
- [ ] "Discard & Retry" button resets to idle state
- [ ] All components follow 4-file pattern
- [ ] All files have header comments
- [ ] No TypeScript errors or warnings
- [ ] UI is responsive and centered on mobile/desktop
