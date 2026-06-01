// Re-analyze all sessions with the latest analysis prompt to generate new metric scores
// (lexicalSophistication, registerPragmatics, collocations, CEFR, etc.)

import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

const prisma = new PrismaClient();
const anthropic = new Anthropic();

const NEW_METRIC_KEYS = ['lexicalSophistication', 'registerPragmatics'] as const;

const metricSchema = z.object({
  key: z.string(),
  level: z.enum(['low', 'medium', 'high']),
  score: z.number().min(1).max(10),
  note: z.string(),
});

const backfillResponseSchema = z.object({
  metrics: z.array(metricSchema),
  vocabularySuggestions: z.array(z.object({
    word: z.string(),
    meaning: z.string(),
    exampleSentence: z.string(),
  })).max(3).optional(),
});

async function analyzeForNewMetrics(transcript: string): Promise<z.infer<typeof backfillResponseSchema> | null> {
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `You are an English speaking coach. Analyze this transcript and score these metrics on a 1-10 scale.

METRICS TO SCORE:
1. **lexicalSophistication** — How advanced and varied is the vocabulary? Low (1-3) = basic/repetitive words. Medium (4-6) = mix of common and some advanced. High (7-10) = rich, precise, C1/C2-level vocabulary with collocations.
2. **registerPragmatics** — How appropriate is the tone and register? Low (1-3) = awkward shifts, too formal or too casual. Medium (4-6) = mostly consistent but some mismatches. High (7-10) = natural register with appropriate hedging and directness.

Also score these existing metrics if you can assess them:
3. **connectorRepetition** — Variety of discourse connectors (however, moreover, consequently vs just "so", "and", "but"). High score = varied connectors.
4. **structuralVariety** — Mix of sentence structures (simple, compound, complex). High score = varied.
5. **vocabularyPrecision** — Using the right word for the right context. High score = precise.
6. **verbAccuracy** — Correct tense, aspect, mood. High score = accurate.
7. **argumentClosure** — Completing arguments and conclusions. High score = well-closed.
8. **fillerUsage** — Minimal filler words (um, uh, like, you know). High score = few fillers.

Also produce vocabularySuggestions — exactly 2-3 C1/C2 words the speaker could adopt.

Return ONLY valid JSON:
{"metrics": [{"key": "lexicalSophistication", "level": "medium", "score": 6, "note": "brief note"}], "vocabularySuggestions": [{"word": "...", "meaning": "...", "exampleSentence": "..."}]}

Transcript:
${transcript}`,
    }],
  });

  const content = message.content[0];
  if (content?.type !== 'text') return null;

  const cleaned = content.text.trim().replace(/^```(?:json)?\s*/u, '').replace(/\s*```$/u, '');
  try {
    const parsed = JSON.parse(cleaned);
    const result = backfillResponseSchema.safeParse(parsed);
    if (result.success) return result.data;
  } catch { /* ignore */ }
  return null;
}

async function main() {
  const sessions = await prisma.speakingSession.findMany({
    where: { status: 'DONE' },
    select: { id: true, userId: true },
    orderBy: { createdAt: 'desc' },
  });

  const transcripts = await prisma.transcript.findMany({
    where: { sessionId: { in: sessions.map(s => s.id) } },
    select: { sessionId: true, text: true },
  });

  const transcriptMap = new Map(transcripts.map(t => [t.sessionId, t.text]));

  console.log(`Found ${sessions.length} DONE sessions, ${transcripts.length} with transcripts\n`);

  let updated = 0;
  let skipped = 0;

  for (const session of sessions) {
    const transcript = transcriptMap.get(session.id);
    if (!transcript || transcript.split(/\s+/).filter(Boolean).length < 20) {
      console.log(`  #${session.id.slice(-6)} ${session.id}: no/short transcript — skipping`);
      skipped++;
      continue;
    }

    // Check if already has new metrics
    const existingMetrics = await prisma.metricSnapshot.findMany({
      where: { sessionId: session.id, key: { in: [...NEW_METRIC_KEYS] } },
    });

    if (existingMetrics.length >= NEW_METRIC_KEYS.length) {
      console.log(`  #${session.id.slice(-6)} ${session.id}: already has new metrics — skipping`);
      skipped++;
      continue;
    }

    try {
      const result = await analyzeForNewMetrics(transcript);
      if (!result) {
        console.log(`  #${session.id.slice(-6)} ${session.id}: analysis failed — skipping`);
        skipped++;
        continue;
      }

      // Upsert all metrics (update existing, add new)
      for (const metric of result.metrics) {
        await prisma.metricSnapshot.upsert({
          where: { sessionId_key: { sessionId: session.id, key: metric.key } },
          create: { sessionId: session.id, key: metric.key, level: metric.level, score: metric.score, note: metric.note },
          update: { level: metric.level, score: metric.score, note: metric.note },
        });
      }

      const newKeys = result.metrics.map(m => m.key).join(', ');
      console.log(`  #${session.id.slice(-6)} ${session.id}: ✅ ${result.metrics.length} metrics (${newKeys})`);
      updated++;
    } catch (err) {
      console.error(`  #${session.id.slice(-6)} ${session.id}: ❌`, err instanceof Error ? err.message : err);
      skipped++;
    }
  }

  console.log(`\nDone: ${updated} updated, ${skipped} skipped`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
