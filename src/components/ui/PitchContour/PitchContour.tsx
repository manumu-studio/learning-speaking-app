// SVG pitch contour visualization — F0 over time with unvoiced gaps
'use client';
/* eslint-disable max-lines-per-function */

import { useId, useMemo } from 'react';
import type { PitchContourProps } from '@/components/ui/PitchContour/PitchContour.types';

const MIN_F0_HZ = 75;
const MAX_F0_HZ = 400;
const CHART_HEIGHT = 160;
const CHART_PADDING = { top: 16, right: 12, bottom: 28, left: 44 };

function hzToY(hz: number, plotHeight: number): number {
  const clamped = Math.min(MAX_F0_HZ, Math.max(MIN_F0_HZ, hz));
  const ratio = (clamped - MIN_F0_HZ) / (MAX_F0_HZ - MIN_F0_HZ);
  return CHART_PADDING.top + plotHeight * (1 - ratio);
}

export function PitchContour({
  contour,
  animationDelay,
}: PitchContourProps): React.JSX.Element {
  const labelId = useId();
  const durationSecs = contour.durationMs / 1000;

  const { pathD, plotWidth, plotHeight, width } = useMemo(() => {
    const width = 640;
    const plotWidth = width - CHART_PADDING.left - CHART_PADDING.right;
    const plotHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;
    const segments: string[] = [];
    let currentSegment = '';

    contour.f0Hz.forEach((hz, index) => {
      const timeSecs = (index * contour.frameMs) / 1000;
      const x = CHART_PADDING.left + (timeSecs / Math.max(durationSecs, 0.01)) * plotWidth;
      const isVoiced = contour.voiced[index] === true && hz > 0;

      if (!isVoiced) {
        if (currentSegment.length > 0) {
          segments.push(currentSegment);
          currentSegment = '';
        }
        return;
      }

      const y = hzToY(hz, plotHeight);
      currentSegment +=
        currentSegment.length === 0 ? `M ${x.toFixed(2)} ${y.toFixed(2)}` : ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
    });

    if (currentSegment.length > 0) {
      segments.push(currentSegment);
    }

    return {
      pathD: segments.join(' '),
      plotWidth,
      plotHeight,
      width,
    };
  }, [contour, durationSecs]);

  const gridLines = [100, 150, 200, 250, 300, 350].map((hz) => ({
    hz,
    y: hzToY(hz, plotHeight),
  }));

  return (
    <section
      className="opacity-0 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-5"
      style={{
        animation: 'fadeInUp 0.5s ease-out forwards',
        animationDelay: `${animationDelay}ms`,
      }}
      aria-labelledby={labelId}
    >
      <div className="flex items-center justify-between mb-3">
        <h3
          id={labelId}
          className="text-sm font-semibold text-gray-800 dark:text-gray-200 uppercase tracking-wide"
        >
          Pitch contour
        </h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {durationSecs.toFixed(1)}s · {MIN_F0_HZ}–{MAX_F0_HZ} Hz
        </span>
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${CHART_HEIGHT}`}
          className="w-full min-w-[280px] h-auto text-gray-700 dark:text-gray-200"
          role="img"
          aria-label="Pitch contour chart showing fundamental frequency over time"
        >
          {gridLines.map((line) => (
            <g key={line.hz}>
              <line
                x1={CHART_PADDING.left}
                x2={CHART_PADDING.left + plotWidth}
                y1={line.y}
                y2={line.y}
                className="stroke-gray-200 dark:stroke-gray-600"
                strokeDasharray="4 4"
              />
              <text
                x={CHART_PADDING.left - 8}
                y={line.y + 4}
                textAnchor="end"
                className="fill-gray-500 dark:fill-gray-400 text-[10px]"
              >
                {line.hz}
              </text>
            </g>
          ))}

          <line
            x1={CHART_PADDING.left}
            x2={CHART_PADDING.left + plotWidth}
            y1={CHART_PADDING.top + plotHeight}
            y2={CHART_PADDING.top + plotHeight}
            className="stroke-gray-300 dark:stroke-gray-500"
          />

          {pathD.length > 0 && (
            <path
              d={pathD}
              fill="none"
              className="stroke-violet-600 dark:stroke-violet-400"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          <text
            x={CHART_PADDING.left + plotWidth / 2}
            y={CHART_HEIGHT - 6}
            textAnchor="middle"
            className="fill-gray-500 dark:fill-gray-400 text-[10px]"
          >
            Time (seconds)
          </text>
        </svg>
      </div>

      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Gaps indicate unvoiced regions. Higher lines show higher pitch.
      </p>
    </section>
  );
}
