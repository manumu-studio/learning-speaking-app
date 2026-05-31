// Dev-only: backfill missing pronunciation MetricSnapshots for sessions that have a PronunciationReport
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

function mapAzureScore(azureScore: number): number {
  if (azureScore <= 40) return 1 + (azureScore / 40) * 2;
  if (azureScore <= 60) return 3 + ((azureScore - 40) / 20) * 2;
  if (azureScore <= 80) return 6 + ((azureScore - 60) / 20) * 2;
  return 8 + ((azureScore - 80) / 20) * 2;
}

function mapSpeakingRate(wpm: number): number {
  if (wpm >= 110 && wpm <= 140) return 9;
  if (wpm >= 95 && wpm < 110) return 7;
  if (wpm > 140 && wpm <= 160) return 7;
  if (wpm >= 80 && wpm < 95) return 5;
  if (wpm > 160 && wpm <= 180) return 5;
  if (wpm >= 60 && wpm < 80) return 3;
  if (wpm > 180) return 4;
  return 1;
}

function scoreToLevel(score: number): 'low' | 'medium' | 'high' {
  if (score <= 3) return 'low';
  if (score <= 6) return 'medium';
  return 'high';
}

export async function POST(): Promise<NextResponse> {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Dev only' }, { status: 403 });
  }

  const reports = await prisma.pronunciationReport.findMany({
    select: {
      sessionId: true,
      accuracyScore: true,
      prosodyScore: true,
      speakingRateWpm: true,
    },
  });

  let backfilled = 0;
  let skipped = 0;

  for (const report of reports) {
    const existing = await prisma.metricSnapshot.findMany({
      where: {
        sessionId: report.sessionId,
        key: { in: ['pronunciationAccuracy', 'prosodyScore', 'speakingRate'] },
      },
    });

    if (existing.length === 3) {
      skipped++;
      continue;
    }

    const existingKeys = new Set(existing.map((e) => e.key));

    const metrics = [
      { key: 'pronunciationAccuracy', score: Math.round(mapAzureScore(report.accuracyScore)) },
      { key: 'prosodyScore', score: Math.round(mapAzureScore(report.prosodyScore)) },
      { key: 'speakingRate', score: mapSpeakingRate(report.speakingRateWpm) },
    ] as const;

    for (const { key, score } of metrics) {
      if (existingKeys.has(key)) continue;
      await prisma.metricSnapshot.create({
        data: {
          sessionId: report.sessionId,
          key,
          score,
          level: scoreToLevel(score),
          note: null,
        },
      });
    }

    backfilled++;
  }

  logger.info({ backfilled, skipped, total: reports.length }, 'Pronunciation metrics backfill complete');

  return NextResponse.json({ backfilled, skipped, total: reports.length });
}
