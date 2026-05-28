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
