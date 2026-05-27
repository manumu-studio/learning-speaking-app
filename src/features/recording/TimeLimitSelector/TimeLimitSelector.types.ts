// TimeLimitSelector component prop types

export type TimeLimitOption = 60 | 120 | 300 | null;

export interface TimeLimitSelectorProps {
  selected: TimeLimitOption;
  onChange: (limit: TimeLimitOption) => void;
  /** Disable when recording is in progress */
  disabled?: boolean;
}
