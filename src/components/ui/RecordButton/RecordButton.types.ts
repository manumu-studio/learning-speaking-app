// RecordButton component prop types
type RecordingState = 'idle' | 'recording' | 'stopped';

export interface RecordButtonProps {
  state: RecordingState;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
}
