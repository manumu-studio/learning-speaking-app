// Types for the session history data fetching hook

export interface HistorySession {
  id: string;
  status: string;
  durationSecs: number | null;
  language: string;
  topic: string | null;
  intentLabel: string | null;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DayGroup {
  /** Display label: "Today", "Yesterday", or formatted date like "Feb 21" */
  dayLabel: string;
  /** ISO date key for sorting: "2026-02-23" */
  dateKey: string;
  /** Sessions for this day, sorted by createdAt descending (newest first) */
  sessions: HistorySession[];
}

export interface UseSessionHistoryReturn {
  dayGroups: DayGroup[];
  isLoading: boolean;
  error: string | null;
  total: number;
}
