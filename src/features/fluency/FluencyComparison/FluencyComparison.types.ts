// Type definitions for the FluencyComparison results component

export type RoundNumber = 1 | 2 | 3;
export type TargetMinutes = 4 | 3 | 2;

export interface FluencyRoundResult {
  roundNumber: RoundNumber;
  targetMinutes: TargetMinutes;
  speechRateWpm: number | null;
  fillerCount: number | null;
  hesitationCount: number | null;
}

export interface FluencyDeltas {
  wpmChange: number | null;
  fillerChange: number | null;
  hesitationChange: number | null;
}

export interface FluencyComparisonProps {
  fluencySessionId: string;
  promptTitle: string;
  rounds: FluencyRoundResult[];
}
