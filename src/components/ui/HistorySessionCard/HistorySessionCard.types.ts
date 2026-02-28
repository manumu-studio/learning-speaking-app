// Props for a single session row in the history list
export interface HistorySessionCardProps {
  id: string;
  intentLabel: string | null;
  topic: string | null;
  status: string;
  durationSecs: number | null;
  createdAt: string;
  /** Animation delay in ms for staggered entrance */
  animationDelay?: number;
}
