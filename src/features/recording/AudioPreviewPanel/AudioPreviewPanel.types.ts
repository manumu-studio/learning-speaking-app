// AudioPreviewPanel component prop types

export interface AudioPreviewPanelProps {
  audioPreviewUrl: string;
  vadWarning: { message: string; canProceed: true } | null;
  isUploading: boolean;
  onSubmit: () => void;
  onTryAgain: () => void;
  onDiscard: () => void;
}
