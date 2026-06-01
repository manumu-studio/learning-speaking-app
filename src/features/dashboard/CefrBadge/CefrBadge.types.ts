// CefrBadge component type definitions
import type { CefrLevel, CefrEstimate } from '@/lib/cefr/cefr.types';

export interface CefrBadgeProps {
  estimate: CefrEstimate | null;
}

export type { CefrLevel, CefrEstimate };
