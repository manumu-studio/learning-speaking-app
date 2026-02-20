// QrScanner component type definitions
export interface QrScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}
