// TimeLimitSelector component prop types

export type TimeLimitOption = 30 | 60 | 120 | null;

export interface TimeLimitSelectorProps {
  selected: TimeLimitOption;
  onChange: (limit: TimeLimitOption) => void;
  /** Disable when recording is in progress */
  disabled?: boolean;
}
