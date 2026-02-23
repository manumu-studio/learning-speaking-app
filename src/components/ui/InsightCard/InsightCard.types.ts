// Props interface for the InsightCard component
export interface InsightCardProps {
  category: string;
  pattern: string;
  detail: string;
  frequency: number | null;
  severity: string | null;
  examples: string[] | null;
  suggestion: string | null;
  /** Animation delay in ms for staggered entrance */
  animationDelay?: number;
}
