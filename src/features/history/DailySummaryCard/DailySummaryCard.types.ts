// Types for the daily summary card — matches session hero card style with pillar scores

export interface PillarScores {
  delivery: number;
  language: number;
  pronunciation: number;
}

export interface DailyConclusionSummary {
  date: string;
  overallScore: number;
  totalDurationSecs: number;
  totalWords: number;
  topicSentence: string;
  sessionCount: number;
  activeTargetsTomorrow: string[];
  pillarScores: PillarScores;
}

export interface DailySummaryCardProps {
  dateKey: string;
  onTapDay?: (date: string) => void;
}
