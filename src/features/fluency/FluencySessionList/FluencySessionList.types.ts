// Prop types for the FluencySessionList component

export interface FluencySessionRound {
  roundNumber: 1 | 2 | 3;
  speechRateWpm: number | null;
}

export interface FluencySessionSummary {
  id: string;
  promptTitle: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  createdAt: string;
  rounds: FluencySessionRound[];
}

export interface FluencySessionListProps {
  sessions: FluencySessionSummary[];
}
