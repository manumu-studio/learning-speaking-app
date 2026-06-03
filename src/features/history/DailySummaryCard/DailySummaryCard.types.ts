// Types for the subtle daily summary card — shows overall score, topic, and active targets

export interface DailyConclusionSummary {
  date: string;
  overallScore: number;
  totalDurationSecs: number;
  topicSentence: string;
  sessionCount: number;
  activeTargetsTomorrow: string[];
}

export interface DailySummaryCardProps {
  dateKey: string;
  onTapDay?: (date: string) => void;
}
