// Type definitions for the TimedRecording 4-3-2 fluency component

export type RoundNumber = 1 | 2 | 3;

export interface CompletedRound {
  roundNumber: RoundNumber;
  speechRateWpm: number | null;
  fillerCount: number | null;
  hesitationCount: number | null;
}

export interface TimedRecordingProps {
  fluencySessionId: string;
  promptTitle: string;
  promptText: string;
  completedRounds: CompletedRound[];
  onAllRoundsComplete: () => void;
}
