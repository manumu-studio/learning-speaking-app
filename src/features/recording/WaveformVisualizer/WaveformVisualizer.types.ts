// WaveformVisualizer component and hook prop types

export interface WaveformVisualizerProps {
  /** Live MediaStream from useAudioRecorder. Null when not recording. */
  stream: MediaStream | null;
  /** Number of frequency bars to render. Default: 24 */
  barCount?: number;
  /** Bar colour class (Tailwind). Default: 'bg-red-400' */
  barColorClass?: string;
}

export interface UseWaveformVisualizerOptions {
  stream: MediaStream | null;
  barCount?: number;
}

export interface UseWaveformVisualizerReturn {
  /** Normalised bar heights, values 0–1, length = barCount */
  barHeights: readonly number[];
}
