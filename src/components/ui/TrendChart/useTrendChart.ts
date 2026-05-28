// useTrendChart — manages hover state and responsive container width
'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { TrendDataItem, TooltipState } from './TrendChart.types';

export const MARGIN = { top: 8, right: 8, bottom: 28, left: 32 } as const;

const SSR_DEFAULT_WIDTH = 600;

/** Distributes data points evenly across the inner width */
export function toX(index: number, count: number, innerWidth: number): number {
  if (count <= 1) return innerWidth / 2;
  return (index / (count - 1)) * innerWidth;
}

/** Maps a 0-10 value to SVG Y coordinate (inverted: 10 at top, 0 at bottom) */
export function toY(value: number, innerHeight: number): number {
  return innerHeight - (value / 10) * innerHeight;
}

/** Least-squares linear regression returning start/end points for the line */
export function computeRegressionLine(
  data: TrendDataItem[],
  innerWidth: number,
  innerHeight: number,
): { x1: number; y1: number; x2: number; y2: number } | null {
  if (data.length < 2) return null;

  const n = data.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    const item = data[i];
    if (!item) continue;
    sumX += i;
    sumY += item.value;
    sumXY += i * item.value;
    sumXX += i * i;
  }

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return null;

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  const startValue = intercept;
  const endValue = slope * (n - 1) + intercept;

  return {
    x1: toX(0, n, innerWidth),
    y1: toY(startValue, innerHeight),
    x2: toX(n - 1, n, innerWidth),
    y2: toY(endValue, innerHeight),
  };
}

/** Formats 'YYYY-MM-DD' as 'MMM D' (e.g. 'Jan 5') using UTC to avoid timezone shifts */
export function formatDate(dateStr: string): string {
  const parts = dateStr.split('-').map(Number);
  const year = parts[0] ?? 0;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function useTrendChart(data: TrendDataItem[]) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgWidth, setSvgWidth] = useState(SSR_DEFAULT_WIDTH);
  const [tooltipState, setTooltipState] = useState<TooltipState | null>(null);
  const uid = useId();
  const gradientId = `trend-gradient-${uid.replace(/:/g, '')}`;

  // Responsive width via ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setSvgWidth(entry.contentRect.width);
      }
    });

    observer.observe(el);
    setSvgWidth(el.clientWidth);

    return () => {
      observer.disconnect();
    };
  }, []);

  const innerWidth = svgWidth - MARGIN.left - MARGIN.right;
  const count = data.length;

  const onMouseMove = useCallback(
    (e: React.MouseEvent<SVGRectElement>) => {
      if (count === 0) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const idx =
        count <= 1
          ? 0
          : Math.round((clientX / rect.width) * (count - 1));
      const clamped = Math.max(0, Math.min(count - 1, idx));
      const point = data[clamped];
      if (!point) return;
      setTooltipState({
        index: clamped,
        x: toX(clamped, count, innerWidth),
        y: toY(point.value, 0), // recalculated in component with actual innerHeight
      });
    },
    [count, innerWidth, data],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent<SVGRectElement>) => {
      if (count === 0) return;
      const touch = e.touches[0];
      if (!touch) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const clientX = touch.clientX - rect.left;
      const idx =
        count <= 1
          ? 0
          : Math.round((clientX / rect.width) * (count - 1));
      const clamped = Math.max(0, Math.min(count - 1, idx));
      const point = data[clamped];
      if (!point) return;
      setTooltipState({
        index: clamped,
        x: toX(clamped, count, innerWidth),
        y: toY(point.value, 0),
      });
    },
    [count, innerWidth, data],
  );

  const onMouseLeave = useCallback(() => {
    setTooltipState(null);
  }, []);

  return {
    containerRef,
    svgWidth,
    tooltipState,
    onMouseMove,
    onTouchMove,
    onMouseLeave,
    gradientId,
    MARGIN,
  };
}
