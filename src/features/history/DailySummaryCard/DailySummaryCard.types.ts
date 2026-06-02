// Types for the daily summary card shown in history view

export interface DailySummaryData {
  date: string;
  deliveryAvg: number;
  languageAvg: number;
  pronunciationAvg: number;
  newWords: string[];
  feedback: string;
  sessionCount: number;
}

export interface DailySummaryCardProps {
  dateKey: string;
}
