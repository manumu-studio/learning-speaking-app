// Dashboard feature type definitions

export type MetricKey =
  | 'connectorRepetition'
  | 'structuralVariety'
  | 'vocabularyPrecision'
  | 'verbAccuracy'
  | 'argumentClosure'
  | 'fillerUsage';

export type MetricLevel = 'low' | 'medium' | 'high';

export type MetricScore = {
  key: MetricKey;
  level: MetricLevel;
  score: number;
  note: string;
};

export type TrendDirection = 'improving' | 'stable' | 'declining';

export type DashboardMetric = {
  key: MetricKey;
  label: string;
  currentLevel: MetricLevel;
  currentScore: number;
  trend: TrendDirection;
  history: number[];
  lastTrainedToday?: boolean | undefined;
};

export type RecentSession = {
  id: string;
  createdAt: Date;
  intentLabel: string | null;
  focusNext: string | null;
};

export type DrillStatsData = {
  totalCompleted: number;
  weeklyCompleted: number;
  improvementRate: number;
  byMetric: Record<MetricKey, number>;
};

export type DashboardData = {
  weeklyMinutes: number;
  weeklySessionCount: number;
  totalSessions: number;
  currentStreak: number;
  currentFocus: string | null;
  metrics: DashboardMetric[];
  recentSessions: RecentSession[];
  drillStats: DrillStatsData;
};
