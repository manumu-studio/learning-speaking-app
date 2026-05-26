// Types for post-analysis NER filtering of transcription false positives

import type { Insight } from '@/lib/ai/analyze';

export interface FilterResult {
  kept: Insight[];
  filtered: Insight[];
  filterReasons: Array<{ word: string; reason: string }>;
}
