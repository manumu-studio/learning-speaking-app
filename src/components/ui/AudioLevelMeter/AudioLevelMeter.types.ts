// AudioLevelMeter component prop and hook types
export type LevelWarning = 'clipping' | 'too_quiet' | null;

export interface AudioLevelMeterProps {
  stream: MediaStream | null;
  isActive: boolean;
  className?: string;
}

export interface UseAudioLevelMeterReturn {
  level: number;
  warning: LevelWarning;
}

export interface UseAudioLevelMeterOptions {
  stream: MediaStream | null;
  isActive: boolean;
}
