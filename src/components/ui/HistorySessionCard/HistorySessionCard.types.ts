// Props for a single session row in the history list
import type { SessionListItem } from '@/features/session/useSessionHistory.types';

export interface HistorySessionCardProps extends SessionListItem {
  /** Animation delay in ms for staggered entrance */
  animationDelay?: number;
  /** Called when user wants to delete this session */
  onDelete?: (id: string) => void;
}
