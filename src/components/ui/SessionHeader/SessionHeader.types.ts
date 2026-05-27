// Props for the SessionHeader component
export interface SessionHeaderProps {
  summary: string | null;
  durationSecs: number | null;
  wordCount: number | null;
  insightCount: number;
  createdAt: string;
  /** Animation delay in ms for entrance */
  animationDelay?: number;
  /** Ordinal workout number for this user (e.g., 47 → "Workout #47") */
  workoutNumber?: number;
}
