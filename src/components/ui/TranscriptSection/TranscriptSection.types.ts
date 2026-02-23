// Props for the TranscriptSection component
export interface TranscriptSectionProps {
  text: string;
  wordCount: number | null;
  /** Animation delay in ms for entrance */
  animationDelay?: number;
}
