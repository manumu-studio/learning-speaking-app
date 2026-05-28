// Shared types for transcript annotation — used by matcher utility and AnnotatedTranscript component

export type PinVariant = 'strength' | 'building' | 'sharpen';

export interface SentenceAnnotation {
  insightId: string;
  category: string;
  pattern: string;
  suggestion: string | null;
  pinVariant: PinVariant;
}

/** Map from sentence index → annotations on that sentence */
export type AnnotationMap = Map<number, SentenceAnnotation[]>;
