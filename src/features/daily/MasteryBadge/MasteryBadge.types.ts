// Types for the MasteryBadge component

export interface MasteryBadgeProps {
  state: 'emerging' | 'developing' | 'consolidating' | 'mastered';
  usageCount: number;
}
