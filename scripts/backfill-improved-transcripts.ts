// One-off backfill: generate vocab suggestions + improved transcripts for all existing sessions

import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';

const prisma = new PrismaClient();
const anthropic = new Anthropic();

const MIN_WORD_COUNT = 20;

type VocabSuggestion = { word: string; meaning: string; exampleSentence: string };

async function generateVocabSuggestions(transcript: string): Promise<VocabSuggestion[]> {
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are an English speaking coach. Read this transcript and suggest exactly 3 vocabulary upgrades — real, useful C1/C2 words the speaker could adopt.

Return ONLY valid JSON — no markdown, no commentary.

Transcript:
${transcript}

{"vocabularySuggestions": [{"word": "...", "meaning": "...", "exampleSentence": "..."}]}`,
      },
    ],
  });

  const content = message.content[0];
  if (content?.type !== 'text') return [];

  const cleaned = content.text.trim().replace(/^```(?:json)?\s*/u, '').replace(/\s*```$/u, '');
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed?.vocabularySuggestions)) {
      return parsed.vocabularySuggestions as VocabSuggestion[];
    }
  } catch {
    // ignore parse errors
  }
  return [];
}

async function rewriteTranscript(
  originalText: string,
  vocabSuggestions: VocabSuggestion[],
): Promise<{ improvedText: string; wordsUsed: string[] } | null> {
  const vocabList = vocabSuggestions
    .map((v) => `- "${v.word}" (${v.meaning}). Example: ${v.exampleSentence}`)
    .join('\n');

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `You are a writing coach. Rewrite this transcript to naturally incorporate the suggested vocabulary words. Keep the speaker's meaning, structure, and tone — only upgrade word choice. If a word doesn't fit, skip it.

Return ONLY valid JSON — no markdown, no code fences.

Vocabulary suggestions:
${vocabList}

Original transcript:
${originalText}

{"improvedText": "the full rewritten transcript", "wordsUsed": ["word1", "word2"]}`,
      },
    ],
  });

  const content = message.content[0];
  if (content?.type !== 'text') return null;

  const cleaned = content.text.trim().replace(/^```(?:json)?\s*/u, '').replace(/\s*```$/u, '');
  try {
    const parsed = JSON.parse(cleaned);
    if (typeof parsed?.improvedText === 'string' && Array.isArray(parsed?.wordsUsed)) {
      return {
        improvedText: parsed.improvedText as string,
        wordsUsed: (parsed.wordsUsed as unknown[]).filter((w): w is string => typeof w === 'string'),
      };
    }
  } catch {
    // ignore parse errors
  }
  return null;
}

async function main() {
  const transcripts = await prisma.transcript.findMany({
    where: { improvedText: null },
    orderBy: { session: { createdAt: 'desc' } },
    include: { session: { select: { id: true, userId: true } } },
  });

  console.log(`Found ${transcripts.length} transcripts to backfill\n`);

  let updated = 0;
  let skipped = 0;

  for (const t of transcripts) {
    const wordCount = t.text.split(/\s+/).filter(Boolean).length;
    if (wordCount < MIN_WORD_COUNT) {
      console.log(`  ${t.sessionId}: ${wordCount} words — too short, skipping`);
      skipped++;
      continue;
    }

    try {
      // Step 1: Generate vocab suggestions
      const suggestions = await generateVocabSuggestions(t.text);
      if (suggestions.length === 0) {
        console.log(`  ${t.sessionId}: no vocab suggestions generated — skipping`);
        skipped++;
        continue;
      }

      // Step 2: Persist vocab suggestions
      const normalized = suggestions.map((s) => ({
        userId: t.session.userId,
        word: s.word.toLowerCase().trim(),
        meaning: s.meaning,
        exampleSentence: s.exampleSentence,
        suggestedInSessionId: t.sessionId,
      }));

      await prisma.vocabSuggestion.createMany({
        data: normalized,
        skipDuplicates: true,
      });

      // Step 3: Generate improved transcript
      const result = await rewriteTranscript(t.text, suggestions);
      if (result) {
        await prisma.transcript.update({
          where: { id: t.id },
          data: { improvedText: result.improvedText, wordsUsed: result.wordsUsed },
        });
        console.log(`  ${t.sessionId}: ✅ ${suggestions.length} vocab + rewrite (${result.wordsUsed.join(', ')})`);
        updated++;
      } else {
        console.log(`  ${t.sessionId}: vocab saved but rewrite failed — skipping`);
        skipped++;
      }
    } catch (err) {
      console.error(`  ${t.sessionId}: ❌ error —`, err instanceof Error ? err.message : err);
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
