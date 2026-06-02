// Types for the LaunchCountdown component

export interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export interface LaunchCountdownProps {
  timeLeft: TimeLeft;
  pad: (n: number) => string;
  className?: string | undefined;
}
