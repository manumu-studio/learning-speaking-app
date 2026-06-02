// Types for the LaunchTokenModal desktop invitation-code entry component

export interface LaunchTokenModalProps {
  theme: 'light' | 'dark';
  tokenInput: string;
  error: string | null;
  isValidating: boolean;
  onClose: () => void;
  onTokenChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}
