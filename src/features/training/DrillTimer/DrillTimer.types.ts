// DrillTimer component type definitions

export type TimerMode = 'countdown' | 'countup';

export interface DrillTimerProps {
  mode: TimerMode;
  /** Duration in seconds (countdown target or countup max) */
  duration: number;
  isRunning: boolean;
  onComplete?: () => void;
  className?: string;
}
