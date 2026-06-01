// Props for a day group in the session history
import type { SessionListItem } from '@/features/session/useSessionHistory.types';

export interface HistoryDayGroupProps {
  dayLabel: string;
  dateKey: string;
  sessions: SessionListItem[];
  isToday?: boolean;
  baseDelay?: number;
  onDeleteSession?: (id: string) => void;
}
