// SVG radar chart — 10-axis skill visualization with C2 threshold ring
'use client';

import { useState } from 'react';
import type { SkillRadarProps } from './SkillRadar.types';
import type { RadarRenderProps } from './SkillRadar.render.types';
import { useSkillRadar } from './useSkillRadar';

const CENTER = 150;
const SIZE = 300;

function RadarGridLines({ gridPaths }: Pick<RadarRenderProps, 'gridPaths'>) {
  return (
    <>
      {gridPaths.map((d, i) => (
        <path
          key={`grid-${i}`}
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
          className="text-slate-200 dark:text-slate-700"
        />
      ))}
    </>
  );
}

function RadarAxisLines({ points }: Pick<RadarRenderProps, 'points'>) {
  return (
    <>
      {points.map((p, i) => (
        <line
          key={`axis-${i}`}
          x1={CENTER}
          y1={CENTER}
          x2={p.labelX}
          y2={p.labelY}
          stroke="currentColor"
          strokeWidth="0.5"
          className="text-slate-200 dark:text-slate-700"
        />
      ))}
    </>
  );
}

function RadarScorePoints({ points, hoveredIndex, onEnter, onLeave }: {
  points: RadarRenderProps['points'];
  hoveredIndex: number | null;
  onEnter: (i: number) => void;
  onLeave: () => void;
}) {
  return (
    <>
      {points.map((p, i) => (
        <circle
          key={`point-${i}`}
          cx={p.x}
          cy={p.y}
          r={hoveredIndex === i ? 5 : 3.5}
          fill="currentColor"
          className="text-sky-600 dark:text-sky-400 cursor-pointer"
          onMouseEnter={() => onEnter(i)}
          onMouseLeave={onLeave}
        />
      ))}
    </>
  );
}

function RadarLabels({ points, hoveredIndex }: { points: RadarRenderProps['points']; hoveredIndex: number | null }) {
  return (
    <>
      {points.map((p, i) => (
        <text
          key={`label-${i}`}
          x={p.labelX}
          y={p.labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-slate-500 dark:fill-slate-400"
          fontSize="7"
          fontWeight={hoveredIndex === i ? 600 : 400}
        >
          {p.label}
        </text>
      ))}
    </>
  );
}

function RadarHoverTooltip({ hoveredIndex, points }: { hoveredIndex: number | null; points: RadarRenderProps['points'] }) {
  if (hoveredIndex === null) return null;
  const point = points[hoveredIndex];
  if (!point) return null;
  return (
    <text
      x={CENTER}
      y={CENTER}
      textAnchor="middle"
      dominantBaseline="middle"
      className="fill-slate-800 dark:fill-slate-100"
      fontSize="14"
      fontWeight="700"
    >
      {point.score.toFixed(1)}
    </text>
  );
}

export function SkillRadar({ scores }: SkillRadarProps) {
  const { points, scorePath, thresholdPath, gridPaths } = useSkillRadar(scores);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (scores.length === 0) return null;

  return (
    <div className="mx-auto w-full min-w-[200px] max-w-sm">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full"
        role="img"
        aria-label="Skill radar chart showing scores across all metrics"
      >
        <RadarGridLines gridPaths={gridPaths} />
        <RadarAxisLines points={points} />
        <path
          d={thresholdPath}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="4 3"
          className="text-emerald-400 dark:text-emerald-500"
        />
        <path
          d={scorePath}
          fill="currentColor"
          fillOpacity={0.15}
          stroke="currentColor"
          strokeWidth="2"
          className="text-sky-500 dark:text-sky-400"
        />
        <RadarScorePoints
          points={points}
          hoveredIndex={hoveredIndex}
          onEnter={setHoveredIndex}
          onLeave={() => setHoveredIndex(null)}
        />
        <RadarLabels points={points} hoveredIndex={hoveredIndex} />
        <RadarHoverTooltip hoveredIndex={hoveredIndex} points={points} />
      </svg>
    </div>
  );
}
