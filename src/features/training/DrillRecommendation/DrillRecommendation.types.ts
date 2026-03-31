// DrillRecommendation component type definitions

export interface DrillRecommendationProps {
  drillType: 'rephrase' | 'constraint' | 'vocabUpgrade' | 'precision' | 'conclusion';
  metricLabel: string;
  timeLimit: number;
  onStartDrill: () => void;
  className?: string;
}
