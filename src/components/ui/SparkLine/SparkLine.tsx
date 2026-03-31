// SparkLine — lightweight inline SVG sparkline with gradient fill
'use client';

import { useId } from 'react';
import type { SparkLineProps } from './SparkLine.types';

const DEFAULT_WIDTH = 120;
const DEFAULT_HEIGHT = 32;
const DEFAULT_COLOR = '#3b82f6'; // blue-500

export function SparkLine({
  data,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  color = DEFAULT_COLOR,
  className,
}: SparkLineProps) {
  const uid = useId();
  const gradientId = `sparkline-gradient-${uid.replace(/:/g, '')}`;

  if (data.length === 0) {
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={className}
        aria-hidden="true"
      />
    );
  }

  if (data.length === 1) {
    const y = height / 2;
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={className}
        aria-hidden="true"
      >
        <circle cx={width / 2} cy={y} r={2} fill={color} />
      </svg>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = padding + ((max - value) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const polylinePoints = points.join(' ');

  // Closed polygon for gradient fill (line + bottom edge)
  const fillPoints = [
    ...points,
    `${width},${height}`,
    `0,${height}`,
  ].join(' ');

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0.05} />
        </linearGradient>
      </defs>
      <polygon
        points={fillPoints}
        fill={`url(#${gradientId})`}
      />
      <polyline
        points={polylinePoints}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
