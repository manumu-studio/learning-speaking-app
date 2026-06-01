// Animated frequency-bar visualizer driven by live microphone stream
'use client';

import { useWaveformVisualizer } from './useWaveformVisualizer';
import type { WaveformVisualizerProps } from './WaveformVisualizer.types';

const DEFAULT_BAR_COUNT = 24;
const LARGE_BAR_COUNT = 50;

const SIZE_CONFIG = {
  default: { barWidth: 4, maxHeight: 48, minHeight: 4, gap: 2, containerHeight: 'h-12' },
  large: { barWidth: 2, maxHeight: 160, minHeight: 4, gap: 2, containerHeight: 'h-40' },
} as const;

export function WaveformVisualizer({
  stream,
  barCount,
  barColorClass = 'bg-red-400',
  size = 'default',
}: WaveformVisualizerProps) {
  const config = SIZE_CONFIG[size];
  const resolvedBarCount = barCount ?? (size === 'large' ? LARGE_BAR_COUNT : DEFAULT_BAR_COUNT);
  const { barHeights } = useWaveformVisualizer({ stream, barCount: resolvedBarCount });

  return (
    <div
      className={`flex ${config.containerHeight} w-full max-w-xs items-center justify-center`}
      style={{ gap: config.gap }}
      aria-hidden="true"
    >
      {barHeights.map((height, index) => {
        const barHeightPx = Math.max(config.minHeight, height * config.maxHeight);
        return (
          <div
            key={index}
            className={`rounded-sm transition-all duration-75 ${barColorClass}`}
            style={{ width: config.barWidth, height: barHeightPx }}
          />
        );
      })}
    </div>
  );
}
