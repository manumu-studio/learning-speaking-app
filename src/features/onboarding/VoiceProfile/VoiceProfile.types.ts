// Type definitions for VoiceProfile component

export interface VoiceProfileProps {
  /** ID of the onboarding SpeakingSession to poll and display */
  sessionId: string;
}

/** Subset of metric data shown on the voice profile */
export interface VoiceProfileMetric {
  key: string;
  label: string;
  score: number;
  level: string;
}
