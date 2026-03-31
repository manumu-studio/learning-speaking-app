// DrillFeedback component type definitions

export interface DrillFeedbackProps {
  feedback: string;
  improved: boolean;
  onTryAgain: () => void;
  onBackToResults: () => void;
  onGoToDashboard: () => void;
  className?: string;
}
