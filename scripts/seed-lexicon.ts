// One-shot script: seed UserWord lexicon from analyzed interview transcripts
import { prisma } from '../src/lib/prisma';

const LEXICON_SEED: Array<{ word: string; cefrLevel: string; firstSeenAt: string; sessionCount: number }> = [
  { word: 'absolute', cefrLevel: 'b2', firstSeenAt: '2026-04-21', sessionCount: 1 },
  { word: 'adapt', cefrLevel: 'b2', firstSeenAt: '2026-05-25', sessionCount: 2 },
  { word: 'administrative', cefrLevel: 'b2', firstSeenAt: '2026-04-24', sessionCount: 1 },
  { word: 'advance', cefrLevel: 'b2', firstSeenAt: '2026-04-24', sessionCount: 1 },
  { word: 'aligns', cefrLevel: 'b2', firstSeenAt: '2026-04-30', sessionCount: 1 },
  { word: 'analogy', cefrLevel: 'c1', firstSeenAt: '2026-04-10', sessionCount: 1 },
  { word: 'animation', cefrLevel: 'b2', firstSeenAt: '2026-04-21', sessionCount: 1 },
  { word: 'approach', cefrLevel: 'b2', firstSeenAt: '2026-05-25', sessionCount: 2 },
  { word: 'assess', cefrLevel: 'b2', firstSeenAt: '2026-05-25', sessionCount: 1 },
  { word: 'assumptions', cefrLevel: 'b2', firstSeenAt: '2026-04-10', sessionCount: 2 },
  { word: 'authentication', cefrLevel: 'b2', firstSeenAt: '2026-04-30', sessionCount: 2 },
  { word: 'automation', cefrLevel: 'b2', firstSeenAt: '2026-05-25', sessionCount: 3 },
  { word: 'autonomous', cefrLevel: 'c1', firstSeenAt: '2026-05-05', sessionCount: 1 },
  { word: 'backlog', cefrLevel: 'b2', firstSeenAt: '2026-05-22', sessionCount: 1 },
  { word: 'background', cefrLevel: 'b2', firstSeenAt: '2026-05-05', sessionCount: 2 },
  { word: 'blocker', cefrLevel: 'b2', firstSeenAt: '2026-04-28', sessionCount: 2 },
  { word: 'bootcamp', cefrLevel: 'b2', firstSeenAt: '2026-05-22', sessionCount: 1 },
  { word: 'capabilities', cefrLevel: 'b2', firstSeenAt: '2026-04-30', sessionCount: 1 },
  { word: 'candid', cefrLevel: 'c1', firstSeenAt: '2026-04-10', sessionCount: 1 },
  { word: 'certificate', cefrLevel: 'b2', firstSeenAt: '2026-04-24', sessionCount: 1 },
  { word: 'challenging', cefrLevel: 'b2', firstSeenAt: '2026-05-05', sessionCount: 1 },
  { word: 'chunking', cefrLevel: 'b2', firstSeenAt: '2026-05-05', sessionCount: 1 },
  { word: 'citation', cefrLevel: 'c1', firstSeenAt: '2026-05-05', sessionCount: 1 },
  { word: 'clarify', cefrLevel: 'b2', firstSeenAt: '2026-04-30', sessionCount: 1 },
  { word: 'clause-aware', cefrLevel: 'c1', firstSeenAt: '2026-05-05', sessionCount: 1 },
  { word: 'combined', cefrLevel: 'b2', firstSeenAt: '2026-05-05', sessionCount: 1 },
  { word: 'comparing', cefrLevel: 'b2', firstSeenAt: '2026-04-21', sessionCount: 3 },
  { word: 'competency', cefrLevel: 'b2', firstSeenAt: '2026-04-30', sessionCount: 1 },
  { word: 'compliance', cefrLevel: 'b2', firstSeenAt: '2026-05-05', sessionCount: 1 },
  { word: 'components', cefrLevel: 'b2', firstSeenAt: '2026-04-10', sessionCount: 1 },
  { word: 'confirmed', cefrLevel: 'b2', firstSeenAt: '2026-04-10', sessionCount: 1 },
  { word: 'connection', cefrLevel: 'b2', firstSeenAt: '2026-04-28', sessionCount: 3 },
  { word: 'constant', cefrLevel: 'b2', firstSeenAt: '2026-05-05', sessionCount: 1 },
  { word: 'constitution', cefrLevel: 'c1', firstSeenAt: '2026-05-05', sessionCount: 1 },
  { word: 'containerize', cefrLevel: 'c1', firstSeenAt: '2026-04-24', sessionCount: 1 },
  { word: 'context', cefrLevel: 'b2', firstSeenAt: '2026-05-05', sessionCount: 2 },
  { word: 'continuation', cefrLevel: 'b2', firstSeenAt: '2026-05-05', sessionCount: 1 },
  { word: 'contribute', cefrLevel: 'b2', firstSeenAt: '2026-05-25', sessionCount: 2 },
  { word: 'coordinates', cefrLevel: 'b2', firstSeenAt: '2026-04-21', sessionCount: 2 },
  { word: 'cultural', cefrLevel: 'b2', firstSeenAt: '2026-04-30', sessionCount: 1 },
  { word: 'cultures', cefrLevel: 'b2', firstSeenAt: '2026-05-25', sessionCount: 1 },
  { word: 'dashboard', cefrLevel: 'b2', firstSeenAt: '2026-04-21', sessionCount: 2 },
  { word: 'deadline', cefrLevel: 'b2', firstSeenAt: '2026-04-30', sessionCount: 1 },
  { word: 'decisions', cefrLevel: 'b2', firstSeenAt: '2026-04-24', sessionCount: 3 },
  { word: 'deferred', cefrLevel: 'c1', firstSeenAt: '2026-04-10', sessionCount: 1 },
  { word: 'defining', cefrLevel: 'b2', firstSeenAt: '2026-04-24', sessionCount: 1 },
  { word: 'degradation', cefrLevel: 'c1', firstSeenAt: '2026-04-10', sessionCount: 1 },
  { word: 'degree', cefrLevel: 'b2', firstSeenAt: '2026-05-22', sessionCount: 2 },
  { word: 'deliverable', cefrLevel: 'c1', firstSeenAt: '2026-04-10', sessionCount: 1 },
  { word: 'dependent', cefrLevel: 'b2', firstSeenAt: '2026-04-28', sessionCount: 2 },
  { word: 'deployed', cefrLevel: 'b2', firstSeenAt: '2026-05-05', sessionCount: 2 },
  { word: 'difference', cefrLevel: 'b2', firstSeenAt: '2026-04-21', sessionCount: 1 },
  { word: 'discipline', cefrLevel: 'b2', firstSeenAt: '2026-05-25', sessionCount: 1 },
  { word: 'disagreement', cefrLevel: 'b2', firstSeenAt: '2026-04-21', sessionCount: 3 },
  { word: 'documentation', cefrLevel: 'b2', firstSeenAt: '2026-04-24', sessionCount: 4 },
  { word: 'disease', cefrLevel: 'b2', firstSeenAt: '2026-04-21', sessionCount: 1 },
  { word: 'efficiency', cefrLevel: 'b2', firstSeenAt: '2026-05-25', sessionCount: 2 },
  { word: 'effort', cefrLevel: 'b2', firstSeenAt: '2026-04-24', sessionCount: 1 },
  { word: 'eligible', cefrLevel: 'b2', firstSeenAt: '2026-04-28', sessionCount: 3 },
  { word: 'empowered', cefrLevel: 'b2', firstSeenAt: '2026-04-30', sessionCount: 1 },
  { word: 'escalation', cefrLevel: 'c1', firstSeenAt: '2026-04-10', sessionCount: 1 },
  { word: 'estimate', cefrLevel: 'b2', firstSeenAt: '2026-05-25', sessionCount: 2 },
  { word: 'evolution', cefrLevel: 'b2', firstSeenAt: '2026-05-05', sessionCount: 1 },
  { word: 'evolving', cefrLevel: 'b2', firstSeenAt: '2026-04-24', sessionCount: 2 },
  { word: 'exceptional', cefrLevel: 'c1', firstSeenAt: '2026-05-25', sessionCount: 1 },
  { word: 'executor', cefrLevel: 'b2', firstSeenAt: '2026-05-05', sessionCount: 1 },
  { word: 'existing', cefrLevel: 'b2', firstSeenAt: '2026-04-30', sessionCount: 2 },
  { word: 'exploration', cefrLevel: 'b2', firstSeenAt: '2026-04-24', sessionCount: 1 },
  { word: 'familiar', cefrLevel: 'b2', firstSeenAt: '2026-04-21', sessionCount: 2 },
  { word: 'feedback', cefrLevel: 'b2', firstSeenAt: '2026-04-24', sessionCount: 3 },
  { word: 'figure', cefrLevel: 'b2', firstSeenAt: '2026-04-28', sessionCount: 1 },
  { word: 'flexible', cefrLevel: 'b2', firstSeenAt: '2026-04-24', sessionCount: 3 },
  { word: 'foundation', cefrLevel: 'b2', firstSeenAt: '2026-04-10', sessionCount: 2 },
  { word: 'framework', cefrLevel: 'b2', firstSeenAt: '2026-04-30', sessionCount: 1 },
  { word: 'friction', cefrLevel: 'b2', firstSeenAt: '2026-05-22', sessionCount: 1 },
  { word: 'fulfill', cefrLevel: 'b2', firstSeenAt: '2026-04-28', sessionCount: 1 },
  { word: 'fundamentals', cefrLevel: 'b2', firstSeenAt: '2026-05-05', sessionCount: 2 },
  { word: 'graceful', cefrLevel: 'c1', firstSeenAt: '2026-04-10', sessionCount: 1 },
  { word: 'handoff', cefrLevel: 'b2', firstSeenAt: '2026-05-22', sessionCount: 1 },
  { word: 'harden', cefrLevel: 'b2', firstSeenAt: '2026-05-22', sessionCount: 1 },
  { word: 'harsh', cefrLevel: 'b2', firstSeenAt: '2026-04-21', sessionCount: 2 },
  { word: 'highlights', cefrLevel: 'b2', firstSeenAt: '2026-04-30', sessionCount: 1 },
  { word: 'imitate', cefrLevel: 'b2', firstSeenAt: '2026-05-05', sessionCount: 1 },
  { word: 'improvement', cefrLevel: 'b2', firstSeenAt: '2026-05-25', sessionCount: 2 },
  { word: 'infrastructure', cefrLevel: 'b2', firstSeenAt: '2026-04-10', sessionCount: 1 },
  { word: 'ingestion', cefrLevel: 'c1', firstSeenAt: '2026-05-05', sessionCount: 1 },
  { word: 'inquiries', cefrLevel: 'b2', firstSeenAt: '2026-04-10', sessionCount: 1 },
  { word: 'integration', cefrLevel: 'b2', firstSeenAt: '2026-04-10', sessionCount: 4 },
  { word: 'intense', cefrLevel: 'b2', firstSeenAt: '2026-04-28', sessionCount: 1 },
  { word: 'interactions', cefrLevel: 'b2', firstSeenAt: '2026-05-25', sessionCount: 1 },
  { word: 'investigated', cefrLevel: 'b2', firstSeenAt: '2026-04-21', sessionCount: 1 },
  { word: 'isolation', cefrLevel: 'b2', firstSeenAt: '2026-04-24', sessionCount: 1 },
  { word: 'iteration', cefrLevel: 'b2', firstSeenAt: '2026-05-05', sessionCount: 2 },
  { word: 'manually', cefrLevel: 'b2', firstSeenAt: '2026-05-05', sessionCount: 2 },
  { word: 'maximum', cefrLevel: 'b2', firstSeenAt: '2026-05-25', sessionCount: 1 },
  { word: 'measurable', cefrLevel: 'b2', firstSeenAt: '2026-05-22', sessionCount: 1 },
  { word: 'metadata', cefrLevel: 'b2', firstSeenAt: '2026-04-10', sessionCount: 1 },
  { word: 'methodology', cefrLevel: 'c1', firstSeenAt: '2026-04-10', sessionCount: 1 },
  { word: 'mimic', cefrLevel: 'b2', firstSeenAt: '2026-05-25', sessionCount: 1 },
  { word: 'mock-up', cefrLevel: 'b2', firstSeenAt: '2026-04-21', sessionCount: 3 },
  { word: 'modify', cefrLevel: 'b2', firstSeenAt: '2026-04-24', sessionCount: 1 },
  { word: 'mutual', cefrLevel: 'b2', firstSeenAt: '2026-05-25', sessionCount: 1 },
  { word: 'nervous', cefrLevel: 'b2', firstSeenAt: '2026-04-24', sessionCount: 2 },
  { word: 'opportunity', cefrLevel: 'b2', firstSeenAt: '2026-04-21', sessionCount: 3 },
  { word: 'optimises', cefrLevel: 'b2', firstSeenAt: '2026-04-30', sessionCount: 1 },
  { word: 'orchestration', cefrLevel: 'c1', firstSeenAt: '2026-04-24', sessionCount: 2 },
  { word: 'originally', cefrLevel: 'b2', firstSeenAt: '2026-05-22', sessionCount: 1 },
  { word: 'overwhelming', cefrLevel: 'b2', firstSeenAt: '2026-04-24', sessionCount: 1 },
  { word: 'parallel', cefrLevel: 'b2', firstSeenAt: '2026-05-05', sessionCount: 2 },
  { word: 'patterns', cefrLevel: 'b2', firstSeenAt: '2026-04-21', sessionCount: 3 },
  { word: 'perception', cefrLevel: 'b2', firstSeenAt: '2026-05-25', sessionCount: 1 },
  { word: 'permanent', cefrLevel: 'b2', firstSeenAt: '2026-05-22', sessionCount: 1 },
  { word: 'phasing', cefrLevel: 'b2', firstSeenAt: '2026-04-10', sessionCount: 1 },
  { word: 'pipeline', cefrLevel: 'b2', firstSeenAt: '2026-04-24', sessionCount: 4 },
  { word: 'precompute', cefrLevel: 'b2', firstSeenAt: '2026-04-21', sessionCount: 3 },
  { word: 'productivity', cefrLevel: 'b2', firstSeenAt: '2026-05-05', sessionCount: 1 },
  { word: 'profile', cefrLevel: 'b2', firstSeenAt: '2026-04-10', sessionCount: 1 },
  { word: 'projection', cefrLevel: 'b2', firstSeenAt: '2026-04-21', sessionCount: 3 },
  { word: 'prototype', cefrLevel: 'b2', firstSeenAt: '2026-05-22', sessionCount: 1 },
  { word: 'punitive', cefrLevel: 'c1', firstSeenAt: '2026-04-10', sessionCount: 1 },
  { word: 'recruiter', cefrLevel: 'b2', firstSeenAt: '2026-04-24', sessionCount: 4 },
  { word: 'reference', cefrLevel: 'b2', firstSeenAt: '2026-04-21', sessionCount: 4 },
  { word: 'regardless', cefrLevel: 'b2', firstSeenAt: '2026-04-10', sessionCount: 1 },
  { word: 'regressions', cefrLevel: 'b2', firstSeenAt: '2026-04-10', sessionCount: 1 },
  { word: 'religions', cefrLevel: 'b2', firstSeenAt: '2026-05-25', sessionCount: 1 },
  { word: 'reproducibility', cefrLevel: 'c1', firstSeenAt: '2026-04-24', sessionCount: 1 },
  { word: 'repository', cefrLevel: 'b2', firstSeenAt: '2026-04-21', sessionCount: 2 },
  { word: 'research', cefrLevel: 'b2', firstSeenAt: '2026-04-28', sessionCount: 2 },
  { word: 'residency', cefrLevel: 'b2', firstSeenAt: '2026-04-24', sessionCount: 2 },
  { word: 'respect', cefrLevel: 'b2', firstSeenAt: '2026-05-25', sessionCount: 1 },
  { word: 'responsibilities', cefrLevel: 'b2', firstSeenAt: '2026-04-28', sessionCount: 2 },
  { word: 'restricted', cefrLevel: 'b2', firstSeenAt: '2026-04-10', sessionCount: 1 },
  { word: 'rushed', cefrLevel: 'b2', firstSeenAt: '2026-04-24', sessionCount: 1 },
  { word: 'scalability', cefrLevel: 'c1', firstSeenAt: '2026-04-24', sessionCount: 1 },
  { word: 'schedule', cefrLevel: 'b2', firstSeenAt: '2026-05-25', sessionCount: 1 },
  { word: 'scope', cefrLevel: 'b2', firstSeenAt: '2026-05-25', sessionCount: 1 },
  { word: 'scratch', cefrLevel: 'b2', firstSeenAt: '2026-04-30', sessionCount: 1 },
  { word: 'self-improvement', cefrLevel: 'b2', firstSeenAt: '2026-05-05', sessionCount: 1 },
  { word: 'semantic', cefrLevel: 'c1', firstSeenAt: '2026-05-05', sessionCount: 1 },
  { word: 'separately', cefrLevel: 'b2', firstSeenAt: '2026-05-25', sessionCount: 1 },
  { word: 'sequential', cefrLevel: 'b2', firstSeenAt: '2026-04-24', sessionCount: 2 },
  { word: 'solo', cefrLevel: 'b2', firstSeenAt: '2026-04-30', sessionCount: 3 },
  { word: 'specifically', cefrLevel: 'b2', firstSeenAt: '2026-04-24', sessionCount: 2 },
  { word: 'split', cefrLevel: 'b2', firstSeenAt: '2026-04-30', sessionCount: 1 },
  { word: 'sponsorship', cefrLevel: 'b2', firstSeenAt: '2026-04-30', sessionCount: 1 },
  { word: 'stages', cefrLevel: 'b2', firstSeenAt: '2026-04-28', sessionCount: 2 },
  { word: 'stakeholder', cefrLevel: 'c1', firstSeenAt: '2026-04-10', sessionCount: 1 },
  { word: 'standardized', cefrLevel: 'b2', firstSeenAt: '2026-04-10', sessionCount: 1 },
  { word: 'standards', cefrLevel: 'b2', firstSeenAt: '2026-05-05', sessionCount: 1 },
  { word: 'startup', cefrLevel: 'b2', firstSeenAt: '2026-04-24', sessionCount: 2 },
  { word: 'statistical', cefrLevel: 'b2', firstSeenAt: '2026-04-10', sessionCount: 1 },
  { word: 'straightforward', cefrLevel: 'b2', firstSeenAt: '2026-04-10', sessionCount: 1 },
  { word: 'streamlined', cefrLevel: 'b2', firstSeenAt: '2026-05-22', sessionCount: 1 },
  { word: 'strengths', cefrLevel: 'b2', firstSeenAt: '2026-04-28', sessionCount: 1 },
  { word: 'suitable', cefrLevel: 'b2', firstSeenAt: '2026-05-22', sessionCount: 1 },
  { word: 'supervisor', cefrLevel: 'b2', firstSeenAt: '2026-05-05', sessionCount: 1 },
  { word: 'switched', cefrLevel: 'b2', firstSeenAt: '2026-04-21', sessionCount: 1 },
  { word: 'tailor', cefrLevel: 'b2', firstSeenAt: '2026-04-30', sessionCount: 1 },
  { word: 'technical', cefrLevel: 'b2', firstSeenAt: '2026-04-28', sessionCount: 4 },
  { word: 'trade-offs', cefrLevel: 'b2', firstSeenAt: '2026-05-05', sessionCount: 1 },
  { word: 'validate', cefrLevel: 'b2', firstSeenAt: '2026-04-21', sessionCount: 5 },
  { word: 'vectors', cefrLevel: 'b2', firstSeenAt: '2026-04-10', sessionCount: 1 },
  { word: 'verification', cefrLevel: 'b2', firstSeenAt: '2026-04-10', sessionCount: 1 },
  { word: 'weaknesses', cefrLevel: 'b2', firstSeenAt: '2026-04-28', sessionCount: 1 },
  { word: 'workflow', cefrLevel: 'b2', firstSeenAt: '2026-04-24', sessionCount: 3 },
];

async function main() {
  const targetEmail = process.argv[2] ?? 'jopulido93@hotmail.com';
  const candidates = await prisma.user.findMany({
    where: { email: targetEmail },
    select: { id: true, email: true, _count: { select: { sessions: true } } },
    orderBy: { sessions: { _count: 'desc' } },
  });
  const user = candidates[0] ?? null;

  if (!user) {
    console.error('❌ No user found in database');
    process.exit(1);
  }

  console.log(`🔍 Seeding lexicon for user: ${user.email ?? user.id}`);
  console.log(`📝 Words to seed: ${LEXICON_SEED.length}`);

  let inserted = 0;
  let skipped = 0;

  for (const entry of LEXICON_SEED) {
    const firstSeen = new Date(`${entry.firstSeenAt}T12:00:00Z`);

    try {
      await prisma.userWord.upsert({
        where: {
          userId_word: { userId: user.id, word: entry.word },
        },
        create: {
          userId: user.id,
          word: entry.word,
          cefrLevel: entry.cefrLevel,
          firstSeenAt: firstSeen,
          lastSeenAt: firstSeen,
          sessionCount: entry.sessionCount,
        },
        update: {},
      });
      inserted++;
    } catch (err) {
      console.warn(`  ⚠️ Skipped "${entry.word}": ${err instanceof Error ? err.message : String(err)}`);
      skipped++;
    }
  }

  const totals = await prisma.userWord.groupBy({
    by: ['cefrLevel'],
    where: { userId: user.id },
    _count: true,
  });

  console.log(`\n✅ Done: ${inserted} inserted, ${skipped} skipped`);
  console.log('📊 Lexicon breakdown:');
  for (const t of totals) {
    console.log(`   ${t.cefrLevel.toUpperCase()}: ${t._count}`);
  }

  const total = await prisma.userWord.count({ where: { userId: user.id } });
  console.log(`   Total: ${total} words`);
}

main()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
