// Computes day-over-day pillar score deltas and overall score

export interface PillarScores {
  delivery: number;
  language: number;
  pronunciation: number;
}

export interface PillarDeltas {
  delivery: number | null;
  language: number | null;
  pronunciation: number | null;
}

export interface PillarDeltaResult {
  pillarScores: PillarScores;
  metricDeltas: PillarDeltas;
  overallScore: number;
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

export function computePillarDeltas(
  todayScores: PillarScores,
  yesterdayScores: PillarScores | null,
): PillarDeltaResult {
  const overallScore = roundOne(
    (todayScores.delivery + todayScores.language + todayScores.pronunciation) / 3,
  );

  if (yesterdayScores === null) {
    return {
      pillarScores: todayScores,
      metricDeltas: { delivery: null, language: null, pronunciation: null },
      overallScore,
    };
  }

  return {
    pillarScores: todayScores,
    metricDeltas: {
      delivery: roundOne(todayScores.delivery - yesterdayScores.delivery),
      language: roundOne(todayScores.language - yesterdayScores.language),
      pronunciation: roundOne(todayScores.pronunciation - yesterdayScores.pronunciation),
    },
    overallScore,
  };
}
