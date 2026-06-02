// TrendChart component type definitions

export interface TrendDataItem {
  date: string;          // 'YYYY-MM-DD'
  value: number;         // 0-10
}

export interface TrendChartProps {
  data: TrendDataItem[];
  color?: string;        // hex or CSS color; default '#3b82f6'
  height?: number;       // SVG height in px; default 180
  showTrendLine?: boolean; // dashed linear regression line; default true
  ariaLabel?: string;
  className?: string;
}

export interface TooltipState {
  index: number;
  x: number;
  y: number;
}

export interface ActiveTooltip {
  index: number;
  x: number;
  y: number;
}

export interface TooltipBoxProps {
  activeTooltip: ActiveTooltip;
  innerWidth: number;
  innerHeight: number;
  data: TrendDataItem[];
  color: string;
}

export interface ChartAxesProps {
  innerWidth: number;
  innerHeight: number;
  data: TrendDataItem[];
  count: number;
}

export interface ChartDataLayerProps {
  count: number;
  data: TrendDataItem[];
  innerWidth: number;
  innerHeight: number;
  color: string;
  gradientId: string;
  fillPoints: string;
  polylinePoints: string;
}

export interface RegressionLineProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}
