// DrillRecommendation component type definitions

export interface DrillRecommendationProps {
  drillType: 'rephrase' | 'constraint' | 'vocabUpgrade' | 'precision' | 'conclusion' | 'pronunciation';
  metricLabel: string;
  timeLimit: number;
  onStartDrill: () => void;
  className?: string;
}
