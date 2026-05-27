// Type definitions for OnboardingRecorder component

export interface OnboardingRecorderProps {
  /** Called with the new session ID once the recording is uploaded */
  onComplete: (sessionId: string) => void;
}
