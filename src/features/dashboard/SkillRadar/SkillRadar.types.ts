// SkillRadar component type definitions

export interface RadarScore {
  key: string;
  label: string;
  score: number;
  c2Threshold: number;
}

export interface SkillRadarProps {
  scores: RadarScore[];
}
