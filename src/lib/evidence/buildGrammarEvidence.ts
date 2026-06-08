// Builds GrammarEvidence from grammarFlags JSON on SpeakingSession
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import type { GrammarEvidence, TranscriptSpanRef } from './evidence.types';

const grammarFlagSchema = z.object({
  spanIndex: z.number(),
  verbatimText: z.string(),
  normalizedText: z.string(),
  classification: z.enum(['grammar_error', 'self_correction', 'pronunciation_artifact', 'false_start']),
  errorType: z.enum(['verb_tense', 'article', 'preposition', 'agreement', 'word_order', 'other']).nullable(),
  confidence: z.number(),
  explanation: z.string(),
  suggestion: z.string(),
  corpusEvidence: z.string().nullable(),
});

const divergenceSpanSchema = z.object({
  start: z.number(),
  end: z.number(),
  verbatimText: z.string(),
  normalizedText: z.string(),
  type: z.enum(['insertion', 'deletion', 'substitution']),
  confidence: z.number(),
});

export async function buildGrammarEvidence(sessionId: string): Promise<GrammarEvidence[]> {
  const session = await prisma.speakingSession.findUnique({
    where: { id: sessionId },
    select: { grammarFlags: true, divergenceSpans: true },
  });

  if (session?.grammarFlags == null) return [];

  const flags = z.array(grammarFlagSchema).safeParse(session.grammarFlags);
  if (!flags.success) return [];

  const spans = z.array(divergenceSpanSchema).safeParse(session.divergenceSpans ?? []);
  const spanData = spans.success ? spans.data : [];

  return flags.data.map((flag, index) => {
    const span = spanData[flag.spanIndex];
    const spanRef: TranscriptSpanRef = {
      sessionId,
      startWordIndex: span?.start ?? 0,
      endWordIndex: span?.end ?? 0,
      verbatimText: flag.verbatimText,
      normalizedText: flag.normalizedText,
      confidence: span?.confidence ?? null,
    };

    return {
      ref: {
        source: 'grammar_flag' as const,
        table: 'SpeakingSession',
        rowId: sessionId,
        field: `grammarFlags[${index}]`,
      },
      label: `Grammar: ${flag.classification.replace('_', ' ')}`,
      rawValue: flag,
      displayValue: `${flag.verbatimText} → ${flag.suggestion}`,
      timestamp: '',
      sessionId,
      spanRef,
      classification: flag.classification,
      errorType: flag.errorType,
      corpusEvidence: flag.corpusEvidence,
    };
  });
}
