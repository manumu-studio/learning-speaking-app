// Prop types for the TranscriptHeader sub-component
export interface TranscriptHeaderProps {
  wordCount: number | null;
  annotationCount: number;
  isExpanded: boolean;
  onToggle: () => void;
}
