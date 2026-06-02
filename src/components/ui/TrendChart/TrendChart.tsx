// TrendChart — SVG line chart with axes, hover tooltip, and trend line
'use client';
/* eslint-disable complexity, max-lines-per-function */

import type { TrendChartProps } from './TrendChart.types';
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

export function TrendChart({
  data,
  color = DEFAULT_COLOR,
  height = DEFAULT_HEIGHT,
  showTrendLine = true,
  ariaLabel,
  className,
}: TrendChartProps) {
  const {
    containerRef,
    svgWidth,
    tooltipState,
    onMouseMove,
    onTouchMove,
    onMouseLeave,
    gradientId,
    MARGIN,
  } = useTrendChart(data);

  const innerWidth = svgWidth - MARGIN.left - MARGIN.right;
  const innerHeight = height - MARGIN.top - MARGIN.bottom;
  const count = data.length;

  // Regression line computation
  const regressionLine = showTrendLine
    ? computeRegressionLine(data, innerWidth, innerHeight)
    : null;

  // Recalculate tooltip Y with actual innerHeight
  const tooltipItem = tooltipState !== null ? data[tooltipState.index] : undefined;
  const activeTooltip =
    tooltipState !== null && tooltipItem
      ? {
          index: tooltipState.index,
          x: tooltipState.x,
          y: toY(tooltipItem.value, innerHeight),
        }
      : null;

  // X-axis label indices: first, middle, last
  const xLabelIndices =
    count <= 2
      ? Array.from({ length: count }, (_, i) => i)
      : [0, Math.floor(count / 2), count - 1];

  // Build polyline points string
  const polylinePoints = data
    .map((item, i) => `${toX(i, count, innerWidth)},${toY(item.value, innerHeight)}`)
    .join(' ');

  // Gradient fill polygon: data line + bottom edge closure
  const fillPoints = [
    ...data.map((item, i) => `${toX(i, count, innerWidth)},${toY(item.value, innerHeight)}`),
    `${toX(count - 1, count, innerWidth)},${innerHeight}`,
    `${toX(0, count, innerWidth)},${innerHeight}`,
  ].join(' ');

  // Tooltip flip threshold (70% of inner width)
  const flipThreshold = innerWidth * 0.7;

  return (
    <div ref={containerRef} className={`w-full ${className ?? ''}`}>
      <svg
        width={svgWidth}
        height={height}
        role="img"
        aria-label={ariaLabel ?? 'Trend chart'}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>

        <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
          {/* Y-axis: horizontal guide lines + labels */}
          {Y_TICKS.map((tick) => {
            const y = toY(tick, innerHeight);
            return (
              <g key={tick}>
                <line
                  x1={0}
                  y1={y}
                  x2={innerWidth}
                  y2={y}
                  stroke="currentColor"
                  strokeOpacity={0.1}
                  strokeWidth={1}
                />
                <text
                  x={-6}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={10}
                  fill="currentColor"
                  opacity={0.5}
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* X-axis: date labels */}
          {xLabelIndices.map((idx) => {
            const item = data[idx];
            if (!item) return null;
            return (
              <text
                key={idx}
                x={toX(idx, count, innerWidth)}
                y={innerHeight + 18}
                textAnchor="middle"
                fontSize={10}
                fill="currentColor"
                opacity={0.5}
              >
                {formatDate(item.date)}
              </text>
            );
          })}

          {/* Empty state */}
          {count === 0 && (
            <text
              x={innerWidth / 2}
              y={innerHeight / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={13}
              fill="currentColor"
              opacity={0.4}
            >
              No data
            </text>
          )}

          {/* Single point */}
          {count === 1 && data[0] && (
            <circle
              cx={toX(0, 1, innerWidth)}
              cy={toY(data[0].value, innerHeight)}
              r={4}
              fill={color}
            />
          )}

          {/* Multi-point: gradient fill + polyline */}
          {count >= 2 && (
            <>
              <polygon
                points={fillPoints}
                fill={`url(#${gradientId})`}
              />
              <polyline
                points={polylinePoints}
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}

          {/* Dashed trend/regression line */}
          {regressionLine && (
            <line
              x1={regressionLine.x1}
              y1={regressionLine.y1}
              x2={regressionLine.x2}
              y2={regressionLine.y2}
              stroke={color}
              strokeOpacity={0.4}
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
          )}

          {/* Invisible overlay rect for mouse/touch events */}
          {count >= 1 && (
            <rect
              x={0}
              y={0}
              width={innerWidth}
              height={innerHeight}
              fill="transparent"
              onMouseMove={onMouseMove}
              onTouchMove={onTouchMove}
              onMouseLeave={onMouseLeave}
            />
          )}

          {/* Tooltip */}
          {activeTooltip !== null && (
            <g>
              {/* Vertical guide line */}
              <line
                x1={activeTooltip.x}
                y1={0}
                x2={activeTooltip.x}
                y2={innerHeight}
                stroke="currentColor"
                strokeOpacity={0.2}
                strokeWidth={1}
              />

              {/* Circle on data point */}
              <circle
                cx={activeTooltip.x}
                cy={activeTooltip.y}
                r={4}
                fill={color}
                stroke="white"
                strokeWidth={2}
              />

              {/* Tooltip box */}
              {(() => {
                const flipped = activeTooltip.x > flipThreshold;
                const boxX = flipped ? activeTooltip.x - 78 : activeTooltip.x + 8;
                const boxY = Math.max(0, Math.min(activeTooltip.y - 20, innerHeight - 38));
                const item = data[activeTooltip.index];
                if (!item) return null;

                return (
                  <g>
                    <rect
                      x={boxX}
                      y={boxY}
                      width={70}
                      height={36}
                      rx={4}
                      fill="black"
                      fillOpacity={0.8}
                    />
                    <text
                      x={boxX + 35}
                      y={boxY + 14}
                      textAnchor="middle"
                      fontSize={12}
                      fontWeight="bold"
                      fill="white"
                    >
                      {item.value.toFixed(1)}
                    </text>
                    <text
                      x={boxX + 35}
                      y={boxY + 28}
                      textAnchor="middle"
                      fontSize={10}
                      fill="white"
                      opacity={0.7}
                    >
                      {formatDate(item.date)}
                    </text>
                  </g>
                );
              })()}
            </g>
          )}
        </g>
      </svg>
    </div>
  );
}
