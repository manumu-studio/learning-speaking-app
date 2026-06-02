// Types for the LaunchPageBody component
import type { TimeLeft } from './LaunchCountdown.types';

export interface LaunchPageBodyProps {
  theme: 'light' | 'dark';
  timeLeft: TimeLeft;
  pad: (n: number) => string;
  onToggleTheme: () => void;
  onEnter: () => void;
}
