// RecordingPanel component prop types
export interface RecordingPanelProps {
  onUpload: (blob: Blob, durationSecs: number) => Promise<void>;
}
