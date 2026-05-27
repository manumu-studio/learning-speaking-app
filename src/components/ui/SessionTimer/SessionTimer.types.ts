// SessionTimer component prop types
export interface SessionTimerProps {
  seconds: number;
  isActive: boolean;
  /** When set, shows amber countdown in the final 10 seconds */
  limitSecs?: number;
}
