// One-off backfill: generate improvedText for transcripts that have vocab suggestions but no rewrite yet

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Inline rewrite to avoid Next.js path alias issues in standalone scripts
async function rewriteTranscript(
  originalText: string,
  vocabSuggestions: Array<{ word: string; meaning: string; exampleSentence: string }>,
) {
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const client = new Anthropic();

  const MIN_WORD_COUNT = 20;
  const wordCount = originalText.split(/\s+/).filter(Boolean).length;
  if (wordCount < MIN_WORD_COUNT || vocabSuggestions.length === 0) return null;

  const vocabList = vocabSuggestions
    .map((v) => `- "${v.word}" (${v.meaning}). Example: ${v.exampleSentence}`)
    .join('\n');

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `You are a writing coach. The speaker recorded themselves speaking English. Below is their polished transcript and a list of vocabulary upgrades.

Your job:
1. Rewrite the transcript so it naturally incorporates the suggested vocabulary words
2. Keep the speaker's original meaning, structure, and tone — only upgrade word choice
3. Do NOT add new ideas, do NOT change the argument, do NOT add filler
4. If a suggested word doesn't fit naturally, skip it — never force a word in
5. Return ONLY valid JSON — no markdown, no code fences, no commentary

Vocabulary suggestions:
${vocabList}

Original transcript:
${originalText}

Respond with this exact JSON structure:
{"improvedText": "the full rewritten transcript", "wordsUsed": ["word1", "word2"]}`,
      },
    ],
  });

  const content = message.content[0];
  if (content?.type !== 'text') return null;

  const cleaned = content.text.trim().replace(/^```(?:json)?\s*/u, '').replace(/\s*```$/u, '');
  const parsed = JSON.parse(cleaned);

  if (typeof parsed?.improvedText !== 'string' || !Array.isArray(parsed?.wordsUsed)) return null;
  if (parsed.improvedText.trim().length === 0) return null;

  return {
    improvedText: parsed.improvedText as string,
    wordsUsed: (parsed.wordsUsed as unknown[]).filter((w): w is string => typeof w === 'string'),
  };
}

async function main() {
  const transcripts = await prisma.transcript.findMany({
    where: { improvedText: null },
    orderBy: { session: { createdAt: 'desc' } },
    select: { id: true, sessionId: true, text: true },
  });

  console.log(`Found ${transcripts.length} transcripts without improvedText`);

  let updated = 0;
  let skipped = 0;

  for (const t of transcripts) {
    const vocabSuggestions = await prisma.vocabSuggestion.findMany({
      where: { suggestedInSessionId: t.sessionId },
      select: { word: true, meaning: true, exampleSentence: true },
    });

    if (vocabSuggestions.length === 0) {
      console.log(`  ${t.sessionId}: no vocab suggestions — skipping`);
      skipped++;
      continue;
    }

    try {
      const result = await rewriteTranscript(t.text, vocabSuggestions);
      if (result) {
        await prisma.transcript.update({
          where: { id: t.id },
          data: { improvedText: result.improvedText, wordsUsed: result.wordsUsed },
        });
        console.log(`  ${t.sessionId}: ✅ updated (${result.wordsUsed.join(', ')})`);
        updated++;
      } else {
        console.log(`  ${t.sessionId}: rewrite returned null — skipping`);
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
