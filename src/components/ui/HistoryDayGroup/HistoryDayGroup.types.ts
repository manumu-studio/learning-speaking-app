// Props for a day group in the session history
export interface HistorySessionData {
  id: string;
  intentLabel: string | null;
  topic: string | null;
  status: string;
  durationSecs: number | null;
  createdAt: string;
}

export interface HistoryDayGroupProps {
  /** Display label: "Today", "Yesterday", or formatted date like "Feb 21" */
  dayLabel: string;
  sessions: HistorySessionData[];
  /** Base animation delay offset in ms */
  baseDelay?: number;
}
