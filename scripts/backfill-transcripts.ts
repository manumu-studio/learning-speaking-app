// One-shot script: re-polish all existing transcripts with punctuation and capitalization
import { prisma } from '../src/lib/prisma';
import { polishTranscript } from '../src/lib/ai/polishTranscript';

async function main() {
  const transcripts = await prisma.transcript.findMany({
    orderBy: { session: { createdAt: 'desc' } },
    select: { id: true, sessionId: true, text: true, wordCount: true },
  });

  console.log(`Found ${transcripts.length} transcripts to polish`);

  let updated = 0;
  for (const t of transcripts) {
    console.log(`\nPolishing session ${t.sessionId} (${t.text.length} chars)...`);
    const polished = await polishTranscript(t.text);

    if (polished !== t.text) {
      const newWordCount = polished.split(/\s+/).filter(Boolean).length;
      await prisma.transcript.update({
        where: { id: t.id },
        data: { text: polished, wordCount: newWordCount },
      });
      updated++;
      console.log(`  ✅ Updated (${t.text.length} → ${polished.length} chars)`);
    } else {
      console.log(`  ⏭ No changes needed`);
    }
  }

  console.log(`\nDone: ${updated}/${transcripts.length} transcripts updated`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
