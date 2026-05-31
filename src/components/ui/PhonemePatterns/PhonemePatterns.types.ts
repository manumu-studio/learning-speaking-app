// Types for the PhonemePatterns component — displays weak pronunciation sounds

import type { AggregatedPhoneme } from '@/lib/pronunciation/aggregatePhonemes';

export interface PhonemePatternsProps {
  phonemes: AggregatedPhoneme[];
  animationDelay?: number;
}
