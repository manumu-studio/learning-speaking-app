// TrendChart — SVG line chart with axes, hover tooltip, and trend line
'use client';

import type {
  TrendChartProps,
  TooltipBoxProps,
  ChartAxesProps,
  ChartDataLayerProps,
  RegressionLineProps,
} from './TrendChart.types';
import {
  useTrendChart,
  toX,
  toY,
  computeRegressionLine,
  formatDate,
} from './useTrendChart';

const DEFAULT_COLOR = '#3b82f6';
const DEFAULT_HEIGHT = 180;
const Y_TICKS = [0, 2.5, 5, 7.5, 10] as const;

// Y-axis guide lines + labels, and X-axis date labels
function ChartAxes({ innerWidth, innerHeight, data, count }: ChartAxesProps) {
  const xLabelIndices =
    count <= 2 ? Array.from({ length: count }, (_, i) => i) : [0, Math.floor(count / 2), count - 1];

  return (
    <>
      {Y_TICKS.map((tick) => {
        const y = toY(tick, innerHeight);
        return (
          <g key={tick}>
            <line x1={0} y1={y} x2={innerWidth} y2={y} stroke="currentColor" strokeOpacity={0.1} strokeWidth={1} />
            <text x={-6} y={y} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="currentColor" opacity={0.5}>
              {tick}
            </text>
          </g>
        );
      })}
      {xLabelIndices.map((idx) => {
        const item = data[idx];
        if (!item) return null;
        return (
          <text key={idx} x={toX(idx, count, innerWidth)} y={innerHeight + 18} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.5}>
            {formatDate(item.date)}
          </text>
        );
      })}
    </>
  );
}

// Gradient fill, polyline, empty state, and single-point rendering
function ChartDataLayer({ count, data, innerWidth, innerHeight, color, gradientId, fillPoints, polylinePoints }: ChartDataLayerProps) {
  if (count === 0) {
    return (
      <text x={innerWidth / 2} y={innerHeight / 2} textAnchor="middle" dominantBaseline="middle" fontSize={13} fill="currentColor" opacity={0.4}>
        No data
      </text>
    );
  }
  if (count === 1 && data[0]) {
    return <circle cx={toX(0, 1, innerWidth)} cy={toY(data[0].value, innerHeight)} r={4} fill={color} />;
  }
  return (
    <>
      <polygon points={fillPoints} fill={`url(#${gradientId})`} />
      <polyline points={polylinePoints} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}

// Dashed linear regression line
function RegressionLine({ x1, y1, x2, y2, color }: RegressionLineProps) {
  return (
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeOpacity={0.4} strokeWidth={1.5} strokeDasharray="4 3" />
  );
}

// Tooltip: vertical guide, circle marker, and box with value + date
function TooltipBox({ activeTooltip, innerWidth, innerHeight, data, color }: TooltipBoxProps) {
  const flipThreshold = innerWidth * 0.7;
  const flipped = activeTooltip.x > flipThreshold;
  const boxX = flipped ? activeTooltip.x - 78 : activeTooltip.x + 8;
  const boxY = Math.max(0, Math.min(activeTooltip.y - 20, innerHeight - 38));
  const item = data[activeTooltip.index];
  if (!item) return null;

  return (
    <g>
      <line x1={activeTooltip.x} y1={0} x2={activeTooltip.x} y2={innerHeight} stroke="currentColor" strokeOpacity={0.2} strokeWidth={1} />
      <circle cx={activeTooltip.x} cy={activeTooltip.y} r={4} fill={color} stroke="white" strokeWidth={2} />
      <rect x={boxX} y={boxY} width={70} height={36} rx={4} fill="black" fillOpacity={0.8} />
      <text x={boxX + 35} y={boxY + 14} textAnchor="middle" fontSize={12} fontWeight="bold" fill="white">
        {item.value.toFixed(1)}
      </text>
      <text x={boxX + 35} y={boxY + 28} textAnchor="middle" fontSize={10} fill="white" opacity={0.7}>
        {formatDate(item.date)}
      </text>
    </g>
  );
}

export function TrendChart({
  data,
  color = DEFAULT_COLOR,
  height = DEFAULT_HEIGHT,
  showTrendLine = true,
  ariaLabel,
  className,
}: TrendChartProps) {
  const { containerRef, svgWidth, tooltipState, onMouseMove, onTouchMove, onMouseLeave, gradientId, MARGIN } =
    useTrendChart(data);

  const innerWidth = svgWidth - MARGIN.left - MARGIN.right;
  const innerHeight = height - MARGIN.top - MARGIN.bottom;
  const count = data.length;

  const regressionLine = showTrendLine ? computeRegressionLine(data, innerWidth, innerHeight) : null;

  const tooltipItem = tooltipState !== null ? data[tooltipState.index] : undefined;
  const activeTooltip =
    tooltipState !== null && tooltipItem
      ? { index: tooltipState.index, x: tooltipState.x, y: toY(tooltipItem.value, innerHeight) }
      : null;

  const polylinePoints = data.map((item, i) => `${toX(i, count, innerWidth)},${toY(item.value, innerHeight)}`).join(' ');
  const fillPoints = [
    ...data.map((item, i) => `${toX(i, count, innerWidth)},${toY(item.value, innerHeight)}`),
    `${toX(count - 1, count, innerWidth)},${innerHeight}`,
    `${toX(0, count, innerWidth)},${innerHeight}`,
  ].join(' ');

  return (
    <div ref={containerRef} className={`w-full ${className ?? ''}`}>
      <svg width={svgWidth} height={height} role="img" aria-label={ariaLabel ?? 'Trend chart'}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>

        <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
          <ChartAxes innerWidth={innerWidth} innerHeight={innerHeight} data={data} count={count} />

          <ChartDataLayer
            count={count}
            data={data}
            innerWidth={innerWidth}
            innerHeight={innerHeight}
            color={color}
            gradientId={gradientId}
            fillPoints={fillPoints}
            polylinePoints={polylinePoints}
          />

          {regressionLine !== null && <RegressionLine {...regressionLine} color={color} />}

          {count >= 1 && (
            <rect
              x={0} y={0}
              width={innerWidth} height={innerHeight}
              fill="transparent"
              onMouseMove={onMouseMove}
              onTouchMove={onTouchMove}
              onMouseLeave={onMouseLeave}
            />
          )}

          {activeTooltip !== null && (
            <TooltipBox
              activeTooltip={activeTooltip}
              innerWidth={innerWidth}
              innerHeight={innerHeight}
              data={data}
              color={color}
            />
          )}
        </g>
      </svg>
    </div>
  );
}
