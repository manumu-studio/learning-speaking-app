// PillarCard component type definitions

import type { PillarKey } from '../pillars';

export interface PillarCardProps {
  pillarKey: PillarKey;
  label: string;
  averageScore: number;
  delta: number;
  sparklineData: number[];
  /** Tailwind color name: 'blue' | 'violet' | 'emerald' */
  color: string;
  /** Whether the card is currently expanded to show constituent metrics */
  isExpanded?: boolean;
  /** Called when the user clicks the card header to toggle expand state */
  onToggle?: () => void;
  /** Constituent MetricCards rendered when the card is expanded */
  children?: React.ReactNode;
}
