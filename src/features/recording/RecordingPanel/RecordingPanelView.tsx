// Presentational layer for the recording panel — layout and UI rendering
'use client';

import { RecordButton } from '@/components/ui/RecordButton';
import { SessionTimer } from '@/components/ui/SessionTimer';
import { WaveformVisualizer } from '@/features/recording/WaveformVisualizer';
import { CancelRecordingModal } from '@/components/ui/CancelRecordingModal';
import { RecordingControls } from './RecordingControls';
import { RecordingStatusMessages } from './RecordingStatusMessages';
import { RecordingPanelHeader } from './RecordingPanelHeader';
import type { RecordingStatus, RecordingMode } from '@/features/recording/recordingState.types';
import type { PromptCategory, SpeakingPrompt } from '@/features/recording/prompts.config';

export interface RecordingPanelViewProps {
  recordState: RecordingStatus;
  recordingMode: RecordingMode;
  duration: number;
  mediaStream: MediaStream | null;
  warnings: string[];
  isPaused: boolean;
  isPausedBySilence: boolean;
  canPause: boolean;
  silenceWarningActive: boolean;
  secondsUntilAutoStop: number | null;
  error: string | null;
  isCancelModalOpen: boolean;
  hasCompletedChunks: boolean;
  showAutoSaveToast: boolean;
  levelWarning: string | null;
  activeCategory: PromptCategory;
  isFreeSpeak: boolean;
  selectedPrompt: SpeakingPrompt | null;
  idleHint: string | null;
  waveformColor: string;
  onStart: () => void;
  onStop: () => void;
  onCancel: () => void;
  onPause: () => void;
  onResume: () => void;
  onCategoryChange: (category: PromptCategory) => void;
  onFreeSpeakToggle: () => void;
  onDiscard: () => void;
  onFinishEarly: () => void;
  onDismiss: () => void;
}

export function RecordingPanelView({
  recordState, recordingMode, duration, mediaStream, warnings,
  isPaused, isPausedBySilence, canPause, silenceWarningActive, secondsUntilAutoStop,
  error, isCancelModalOpen, hasCompletedChunks, showAutoSaveToast, levelWarning,
  activeCategory, isFreeSpeak, selectedPrompt, idleHint, waveformColor,
  onStart, onStop, onCancel, onPause, onResume,
  onCategoryChange, onFreeSpeakToggle, onDiscard, onFinishEarly, onDismiss,
}: RecordingPanelViewProps) {
  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto h-full py-2">

      {/* Top — context + prompt */}
      <RecordingPanelHeader
        activeCategory={activeCategory}
        isFreeSpeak={isFreeSpeak}
        selectedPrompt={selectedPrompt}
        warnings={warnings}
        onCategoryChange={onCategoryChange}
        onFreeSpeakToggle={onFreeSpeakToggle}
      />

      {/* Center stage — waveform + timer + button + controls */}
      <div className="flex flex-col items-center justify-center flex-1 min-h-0 w-full gap-4">
        {recordState !== 'recording' && !isPaused && (
          <p className="animate-pulse text-xs text-slate-400 dark:text-slate-500">Tap the mic to start</p>
        )}
        <WaveformVisualizer stream={mediaStream} barColorClass={waveformColor} size="large" />
        <SessionTimer seconds={duration} isActive={recordState === 'recording' && !isPaused} />
        <div className="h-4" aria-live="polite">
          {recordState === 'recording' && levelWarning === 'clipping' && (
            <p className="text-xs font-medium text-red-400">Too loud — move back</p>
          )}
          {showAutoSaveToast && (
            <p className="text-xs font-medium text-emerald-500">✓ Progress saved</p>
          )}
        </div>
        <RecordButton
          state={recordState}
          recordingMode={recordingMode}
          onStart={onStart}
          onStop={onStop}
          disabled={recordState === 'recording' && duration < 45}
        />
        <RecordingControls
          recordState={recordState}
          isPaused={isPaused}
          canPause={canPause}
          onCancel={onCancel}
          onPause={onPause}
          onResume={onResume}
        />
      </div>

      {/* Bottom — status messages */}
      <div className="w-full shrink-0 space-y-3 px-2 pb-2">
        {silenceWarningActive && secondsUntilAutoStop !== null && (
          <div className="rounded-lg bg-red-500/10 px-4 py-2 text-center">
            <p className="text-sm font-medium text-red-600 dark:text-red-400">
              Ending in {secondsUntilAutoStop}s — speak to continue
            </p>
          </div>
        )}
        <RecordingStatusMessages
          recordState={recordState}
          isPaused={isPaused}
          isPausedBySilence={isPausedBySilence}
          silenceWarningActive={silenceWarningActive}
          error={error}
          idleHint={idleHint}
        />
      </div>

      <CancelRecordingModal
        isOpen={isCancelModalOpen}
        durationSecs={duration}
        hasCompletedChunks={hasCompletedChunks}
        onDiscard={onDiscard}
        onFinishEarly={onFinishEarly}
        onDismiss={onDismiss}
      />
    </div>
  );
}
