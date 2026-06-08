// Builds TranscriptSpanRef from divergenceSpans JSON on SpeakingSession
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import type { TranscriptSpanRef } from './evidence.types';

const divergenceSpanSchema = z.object({
  start: z.number(),
  end: z.number(),
  verbatimText: z.string(),
  normalizedText: z.string(),
  type: z.enum(['insertion', 'deletion', 'substitution']),
  confidence: z.number(),
});

export async function buildTranscriptEvidence(sessionId: string): Promise<TranscriptSpanRef[]> {
  const session = await prisma.speakingSession.findUnique({
    where: { id: sessionId },
    select: { divergenceSpans: true },
  });

  if (session?.divergenceSpans == null) return [];

  const parsed = z.array(divergenceSpanSchema).safeParse(session.divergenceSpans);
  if (!parsed.success) return [];

  return parsed.data.map((span) => ({
    sessionId,
    startWordIndex: span.start,
    endWordIndex: span.end,
    verbatimText: span.verbatimText,
    normalizedText: span.normalizedText,
    confidence: span.confidence,
  }));
}
