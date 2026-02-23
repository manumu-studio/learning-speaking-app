// Props for the SessionHeader component
export interface SessionHeaderProps {
  summary: string | null;
  durationSecs: number | null;
  wordCount: number | null;
  insightCount: number;
  createdAt: string;
  /** Animation delay in ms for entrance */
  animationDelay?: number;
}
