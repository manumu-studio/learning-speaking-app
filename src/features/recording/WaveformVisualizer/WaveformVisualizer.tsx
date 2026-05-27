// Animated frequency-bar visualizer driven by live microphone stream
'use client';

import { useWaveformVisualizer } from './useWaveformVisualizer';
import type { WaveformVisualizerProps } from './WaveformVisualizer.types';

const DEFAULT_BAR_COUNT = 24;
const BAR_WIDTH_PX = 4;
const MAX_BAR_HEIGHT_PX = 48;
const MIN_BAR_HEIGHT_PX = 4;

export function WaveformVisualizer({
  stream,
  barCount = DEFAULT_BAR_COUNT,
  barColorClass = 'bg-red-400',
}: WaveformVisualizerProps) {
  const { barHeights } = useWaveformVisualizer({ stream, barCount });

  return (
    <div
      className="flex h-12 items-end gap-[2px]"
      aria-hidden="true"
    >
      {barHeights.map((height, index) => {
        const barHeightPx = Math.max(MIN_BAR_HEIGHT_PX, height * MAX_BAR_HEIGHT_PX);
        return (
          <div
            key={index}
            className={`rounded-sm transition-all duration-75 ${barColorClass}`}
            style={{ width: BAR_WIDTH_PX, height: barHeightPx }}
          />
        );
      })}
    </div>
  );
}
