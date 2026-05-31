// Props for the reusable CollapsibleSection accordion wrapper
import type { ReactNode } from 'react';

export interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  count?: number;
  children: ReactNode;
  /** Animation delay in ms for staggered entrance */
  animationDelay?: number;
  /** Optional id suffix for aria-controls — auto-generated when omitted */
  sectionId?: string;
}
