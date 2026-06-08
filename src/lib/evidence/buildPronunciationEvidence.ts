// Builds PronunciationEvidence from WordPronunciation rows
import { prisma } from '@/lib/prisma';
import type { PronunciationEvidence } from './evidence.types';

export async function buildPronunciationEvidence(
  sessionId: string,
): Promise<PronunciationEvidence[]> {
  const report = await prisma.pronunciationReport.findUnique({
    where: { sessionId },
    select: {
      id: true,
      createdAt: true,
      words: {
        orderBy: { wordIndex: 'asc' },
      },
    },
  });

  if (report === null) return [];

  return report.words.map((word) => ({
    ref: {
      source: 'word_pronunciation' as const,
      table: 'WordPronunciation',
      rowId: word.id,
      field: 'accuracyScore',
    },
    label: `"${word.word}" pronunciation`,
    rawValue: word.accuracyScore,
    displayValue: `${word.accuracyScore.toFixed(0)}%`,
    timestamp: report.createdAt.toISOString(),
    sessionId,
    word: word.word,
    accuracyScore: word.accuracyScore,
    expectedIpa: null,
    actualIpa: null,
    errorType: word.errorType,
  }));
}
