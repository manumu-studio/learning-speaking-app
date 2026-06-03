// Props and types for the GrammarSection component
import type { GrammarFlag } from '@/lib/analysis/grammar';

export interface GrammarSectionProps {
  readonly flags: readonly GrammarFlag[];
  readonly animationDelay: number;
}
