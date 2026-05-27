// Types for the session history hook — cursor-paginated activity feed
import type { RefObject } from 'react';

export type DateFilter = '7d' | '30d' | 'all';

/** A single session item as returned by GET /api/sessions */
export interface SessionListItem {
  id: string;
  status: string;
  intentLabel: string | null;
  topic: string | null;
  durationSecs: number | null;
  wordCount: number | null;
  createdAt: string;
  overallScore: number | null;
  pronunciationScore: number | null;
  workoutNumber: number;
}

/** Sessions grouped by calendar day for rendering */
export interface DayGroup {
  dayLabel: string;
  dateKey: string;
  sessions: SessionListItem[];
}

export interface UseSessionHistoryReturn {
  sessions: SessionListItem[];
  dayGroups: DayGroup[];
  isLoading: boolean;
  isFetchingMore: boolean;
  error: string | null;
  hasMore: boolean;
  total: number;
  dateFilter: DateFilter;
  setDateFilter: (filter: DateFilter) => void;
  sentinelRef: RefObject<HTMLDivElement | null>;
}

/** @deprecated Use SessionListItem instead */
export type HistorySession = SessionListItem;
