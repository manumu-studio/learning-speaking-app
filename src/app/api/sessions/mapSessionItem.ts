// Maps a raw Prisma session row (with metrics) to the API response shape
import { extractWordCount } from './extractWordCount';

type MetricSnap = { key: string; score: number };

type RawSessionRow = {
  id: string;
  status: string;
  intentLabel: string | null;
  topic: string | null;
  durationSecs: number | null;
  summary: string | null;
  createdAt: Date;
  metrics: MetricSnap[];
  workoutNumber: number;
};

export type SessionListItem = {
  id: string;
  status: string;
  intentLabel: string | null;
  topic: string | null;
  durationSecs: number | null;
  wordCount: number | null;
  createdAt: string;
  overallScore: number | null;
  pronunciationScore: number | null;
  workoutNumber: number;
};

export function mapSessionItem(s: RawSessionRow): SessionListItem {
  const scores = s.metrics.map((snap) => snap.score);
  const overallScore =
    scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : null;
  const pronSnapshot = s.metrics.find((snap) => snap.key === 'pronunciationAccuracy');
  const pronunciationScore = pronSnapshot?.score ?? null;

  return {
    id: s.id,
    status: s.status,
    intentLabel: s.intentLabel,
    topic: s.topic,
    durationSecs: s.durationSecs,
    wordCount: extractWordCount(s.summary),
    createdAt: s.createdAt.toISOString(),
    overallScore,
    pronunciationScore,
    workoutNumber: s.workoutNumber,
  };
}
