// DrillPromptCard component type definitions

export type DrillType = 'rephrase' | 'constraint' | 'vocabUpgrade' | 'precision' | 'conclusion' | 'pronunciation';

export interface DrillPromptCardProps {
  drillType: DrillType;
  prompt: string;
  sourceExample: string | null;
  timeLimit: number;
  className?: string;
}
