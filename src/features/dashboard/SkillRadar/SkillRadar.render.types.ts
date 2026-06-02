// Internal render prop types for SkillRadar sub-components

export interface RadarPoint {
  x: number;
  y: number;
  labelX: number;
  labelY: number;
  label: string;
  score: number;
}

export interface RadarRenderProps {
  points: RadarPoint[];
  gridPaths: string[];
}
