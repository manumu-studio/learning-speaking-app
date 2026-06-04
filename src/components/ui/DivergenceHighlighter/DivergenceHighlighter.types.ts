// Type definitions for the DivergenceHighlighter component

import type { DivergenceSpan } from '@/lib/analysis/divergence/divergence.types';

export interface DivergenceHighlighterProps {
  /** Full transcript text to render */
  text: string;
  /** Pre-computed divergence spans between verbatim and normalized transcripts */
  divergenceSpans: DivergenceSpan[];
  /** Which side of the comparison this highlighter renders */
  side: 'verbatim' | 'normalized';
}
