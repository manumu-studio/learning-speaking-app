// Props for the NaturalnessInsights section component
import type { NaturalnessFlagDetail } from '@/features/session/useSessionStatus.types';

export interface NaturalnessInsightsProps {
  flags: NaturalnessFlagDetail[];
  animationDelay?: number;
  onFeedback?: (flagId: string, feedback: 'helpful' | 'false_positive') => void;
}
