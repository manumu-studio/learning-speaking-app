// Prop types for the TranscriptBody sub-component
import type { AnnotationMap } from '@/lib/text/annotationTypes';
import type { TranscriptSentence } from '@/lib/text/splitSentences';

export interface TranscriptBodyProps {
  sentences: TranscriptSentence[];
  annotationMap: AnnotationMap;
  highlightedMetricKey: string | null | undefined;
}
