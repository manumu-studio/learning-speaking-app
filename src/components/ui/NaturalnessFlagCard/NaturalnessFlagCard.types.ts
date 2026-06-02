// Props for the NaturalnessFlagCard component
import type { NaturalnessFlagDetail } from '@/features/session/useSessionStatus.types';

export interface NaturalnessFlagCardProps {
  flag: NaturalnessFlagDetail;
  onFeedback?: ((flagId: string, feedback: 'helpful' | 'false_positive') => void) | undefined;
}
