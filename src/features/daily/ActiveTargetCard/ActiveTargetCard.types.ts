// Types for the ActiveTargetCard component

export interface ActiveTargetCardProps {
  text: string;
  category: string;
  usageCount: number;
  masteryState: 'emerging' | 'developing' | 'consolidating' | 'mastered';
}
