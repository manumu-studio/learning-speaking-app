// Props and data interfaces for the InsightsList component
export interface InsightData {
  id: string;
  category: string;
  pattern: string;
  detail: string;
  frequency: number | null;
  severity: string | null;
  examples: string[] | null;
  suggestion: string | null;
}

export interface InsightsListProps {
  insights: InsightData[];
  /** Base animation delay offset in ms (default 0) */
  baseDelay?: number;
}
