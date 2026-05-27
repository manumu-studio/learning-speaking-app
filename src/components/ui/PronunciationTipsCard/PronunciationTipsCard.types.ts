// Types for the PronunciationTipsCard component

import { z } from 'zod';
import type { PronunciationReport } from '@/components/ui/PronunciationSection';

export interface PronunciationTipsCardProps {
  pronunciationReport: PronunciationReport;
  animationDelay: number;
}

export type TipsLoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; tips: PronunciationTip[] }
  | { status: 'error' };

export interface PronunciationTip {
  focus: string;
  instruction: string;
}

export const PronunciationTipsResponseSchema = z.object({
  tips: z.array(
    z.object({
      focus: z.string(),
      instruction: z.string(),
    })
  ),
});
