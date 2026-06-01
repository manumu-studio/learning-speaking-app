// Type definitions for VocabTabs component
import type { z } from 'zod';
import type { VocabItemSchema } from '../vocabulary.schemas';

export type VocabTab = 'review' | 'all' | 'collocations';

export type VocabItem = z.infer<typeof VocabItemSchema>;

export interface VocabTabsProps {
  className?: string;
}
