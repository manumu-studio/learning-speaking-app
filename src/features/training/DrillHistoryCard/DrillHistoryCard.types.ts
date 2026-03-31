// DrillHistoryCard component type definitions

export interface DrillHistoryCardProps {
  id: string;
  drillType: 'rephrase' | 'constraint' | 'vocabUpgrade' | 'precision' | 'conclusion';
  metricKey: string;
  metricLabel: string;
  improved: boolean | null;
  completedAt: string | null;
  createdAt: string;
  onClick: (id: string) => void;
  className?: string;
}
