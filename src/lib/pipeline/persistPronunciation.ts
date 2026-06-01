// Persists Azure pronunciation assessment results to the database.
// Writes PronunciationReport, WordPronunciation rows, and MetricSnapshots atomically.
import { prisma } from '@/lib/prisma';
import type { PronunciationResult } from '@/lib/ai/azurePronunciation.types';
import { toInputJson } from '@/lib/prismaJson';

// Map Azure 0-100 score to app 1-10 using an intelligibility-first non-linear curve.
// The curve is lenient at the low end (accent != unintelligible) and rewards
// clear improvement in the 60-80 band where most learners operate.
function mapAzureScore(azureScore: number): number {
  if (azureScore <= 40) {
    return 1 + (azureScore / 40) * 2;
  }
  if (azureScore <= 60) {
    return 3 + ((azureScore - 40) / 20) * 2;
  }
  if (azureScore <= 80) {
    // Larger jump — this is where meaningful progress lives
    return 6 + ((azureScore - 60) / 20) * 2;
  }
  return 8 + ((azureScore - 80) / 20) * 2;
}

// Map speaking rate (WPM) to a 1-10 score.
// Target range for learners: 110-140 WPM. Native English: ~130-150 WPM.
// Penalizes both too-slow (< 90 WPM) and too-fast (> 170 WPM).
function mapSpeakingRate(wpm: number): number {
  if (wpm >= 110 && wpm <= 140) return 9;
  if (wpm >= 95 && wpm < 110) return 7;
  if (wpm > 140 && wpm <= 160) return 7;
  if (wpm >= 80 && wpm < 95) return 5;
  if (wpm > 160 && wpm <= 180) return 5;
  if (wpm >= 60 && wpm < 80) return 3;
  if (wpm > 180) return 4; // Too fast, but at least fluent
  return 1; // < 60 WPM — very halting
}

// Compute speaking rate (WPM) from word-level timing data.
// Excludes insertions and omissions — only counts spoken valid words.
function computeSpeakingRateWpm(result: PronunciationResult): number {
  const validWords = result.words.filter(
    (w) => w.errorType !== 'Insertion' && w.errorType !== 'Omission',
  );
  if (validWords.length === 0) return 0;

  const totalDurationMs = validWords.reduce((sum, w) => sum + w.durationMs, 0);
  if (totalDurationMs === 0) return 0;

  return (validWords.length / (totalDurationMs / 60_000));
}

// Derive MetricSnapshot level band from a 1-10 score.
function scoreToLevel(score: number): 'low' | 'medium' | 'high' {
  if (score <= 3) return 'low';
  if (score <= 6) return 'medium';
  return 'high';
}

// SDK version constant — kept as a literal to avoid dynamic require in Next.js edge runtime.
export const AZURE_SDK_VERSION = '1.42.0';

/** Atomically writes PronunciationReport, WordPronunciation rows, and the three pronunciation MetricSnapshots for a session. */
export async function persistPronunciation(
  sessionId: string,
  result: PronunciationResult,
): Promise<void> {
  const speakingRateWpm = computeSpeakingRateWpm(result);

  const accuracySnapshotScore = Math.round(mapAzureScore(result.accuracyScore));
  const prosodySnapshotScore = Math.round(mapAzureScore(result.prosodyScore));
  const speakingRateSnapshotScore = mapSpeakingRate(speakingRateWpm);

  await prisma.$transaction(
    async (tx) => {
    const reportFields = {
      pronScore: result.pronScore,
      accuracyScore: result.accuracyScore,
      fluencyScore: result.fluencyScore,
      completenessScore: result.completenessScore,
      prosodyScore: result.prosodyScore,
      speakingRateWpm,
      azureSdkVersion: AZURE_SDK_VERSION,
      rawJson: toInputJson(result.rawUtterances),
    };

    // Upsert PronunciationReport (idempotent for QStash retries)
    const report = await tx.pronunciationReport.upsert({
      where: { sessionId },
      create: { sessionId, ...reportFields },
      update: reportFields,
    });

    // Delete existing word rows before re-inserting (idempotent on retry)
    await tx.wordPronunciation.deleteMany({ where: { reportId: report.id } });

    // Insert word rows
    await tx.wordPronunciation.createMany({
      data: result.words.map((w, index) => ({
        reportId: report.id,
        wordIndex: index,
        word: w.word,
        display: w.display ?? null,
        accuracyScore: w.accuracyScore,
        errorType: w.errorType,
        offsetMs: Math.round(w.offsetMs),
        durationMs: Math.round(w.durationMs),
        breakErrorTypes: w.prosodyFeedback?.breakErrorTypes ?? [],
        intonationErrorTypes: w.prosodyFeedback?.intonationErrorTypes ?? [],
        monotonePitchDelta: w.prosodyFeedback?.monotoneSyllablePitchDeltaConfidence ?? null,
        phonemes: toInputJson(w.phonemes),
        l1Tags: w.l1Tags ?? [],
      })),
    });

    // Upsert MetricSnapshots for the 3 pronunciation-derived metrics
    const metricUpserts = [
      { key: 'pronunciationAccuracy', score: accuracySnapshotScore },
      { key: 'prosodyScore', score: prosodySnapshotScore },
      { key: 'speakingRate', score: speakingRateSnapshotScore },
    ] as const;

    for (const { key, score } of metricUpserts) {
      const level = scoreToLevel(score);
      await tx.metricSnapshot.upsert({
        where: { sessionId_key: { sessionId, key } },
        create: { sessionId, key, level, score, note: null },
        update: { score, level },
      });
    }
    },
    { timeout: 30_000 },
  );
}
