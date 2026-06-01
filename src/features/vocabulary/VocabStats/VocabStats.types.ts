// Type definitions for VocabStats component

export type VocabStatsData = {
  totalItems: number;
  dueCount: number;
  adoptedCount: number;
  adoptionRate: number;
  averageInterval: number;
  domainBreakdown: Array<{ domain: string; count: number }>;
  typeBreakdown: Array<{ type: string; count: number }>;
  frequencyBreakdown: Array<{ band: string; count: number }>;
};

export interface VocabStatsProps {
  className?: string;
}
