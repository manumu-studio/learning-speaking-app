// Dev seed script — inserts multiple sessions across days for visual testing of history + results UI
import { PrismaClient, SessionStatus } from '@prisma/client';
import type { SpeakingSession } from '@prisma/client';

const prisma = new PrismaClient();

const DEV_USER = {
  externalId: 'dev-user-local',
  email: 'dev@localhost',
  displayName: 'Dev Tester',
};

const MOCK_TRANSCRIPT = `So, I think the main problem with, you know, learning a new language is that you need to practice every day. I went to store yesterday and I tried to speak English with the cashier. She was very nice and she understand me, but I know I made many mistakes. For example, I always forget to use the articles. Like, I say "I went to store" instead of "I went to the store." It's something I need to work on.

Also, I notice that I use "so" a lot when I start my sentences. So, I think this is because in my native language we use a similar word. So, I need to find other ways to start my sentences. Maybe I can use "however" or "in addition" or something like that.

Another thing is that I tend to use simple sentences. I say "I went there. It was good. I liked it." But I know I should try to make more complex sentences with subordinate clauses and connectors. For example, instead of saying "I went there. It was good." I could say "Although I was tired, I went there and found it to be quite enjoyable."

I think my vocabulary is okay for basic conversations, but I need to expand it for more academic or professional topics. I need to read more books and articles in English to learn new words and expressions.`;

const MOCK_SUMMARY =
  'Solid B2-level speaker with good communicative competence. Main areas for improvement are article usage (systematic omission before nouns), connector variety (heavy reliance on "so"), and sentence complexity (tendency toward simple, short structures rather than subordinate clauses).';

const MOCK_FOCUS_NEXT =
  'Practice using "the" and "a" before every noun in your next session. Before speaking each sentence, mentally check: does this noun need an article?';

const MOCK_INSIGHTS = [
  {
    category: 'grammar',
    pattern: 'Missing articles before nouns',
    detail:
      'Systematically omits definite and indefinite articles before countable nouns, particularly in prepositional phrases. This is a common L1 transfer pattern.',
    frequency: 8,
    severity: 'high',
    examples: [
      'I went to store yesterday',
      'She was very nice and she understand me',
      'I need to find other ways to start my sentences',
    ],
    suggestion:
      'Before speaking each sentence, mentally identify the nouns and add "the" (specific) or "a/an" (general) before each one.',
  },
  {
    category: 'vocabulary',
    pattern: 'Overuse of "so" as sentence starter',
    detail:
      'Uses "so" as the primary discourse connector to introduce new ideas and transitions. Appears at the start of 6 out of 10 sentences, creating a monotonous rhythm.',
    frequency: 6,
    severity: 'medium',
    examples: [
      'So, I think the main problem with...',
      'So, I think this is because...',
      'So, I need to find other ways...',
    ],
    suggestion:
      'Replace "so" with varied connectors: "however," "in contrast," "that said," "from my perspective," "what I\'ve noticed is."',
  },
  {
    category: 'structure',
    pattern: 'Simple sentence chains instead of complex structures',
    detail:
      "Tends to string together short, simple sentences rather than using subordinate clauses, relative clauses, or participial phrases. The speaker is aware of this pattern but hasn't yet automatized complex structures.",
    frequency: 5,
    severity: 'medium',
    examples: [
      'I went there. It was good. I liked it.',
      'She was very nice and she understand me, but I know I made many mistakes.',
    ],
    suggestion:
      'Practice combining two simple sentences into one using "although," "despite," "which," or "having + past participle."',
  },
];

// Metric seed data — realistic progressions for dashboard testing
const METRIC_KEYS = [
  'connectorRepetition',
  'structuralVariety',
  'vocabularyPrecision',
  'verbAccuracy',
  'argumentClosure',
  'fillerUsage',
] as const;

// Base scores with slight upward trend across 7 sessions
const BASE_SCORES: Record<string, number[]> = {
  connectorRepetition: [4, 4, 5, 5, 6, 6, 7],
  structuralVariety:   [5, 5, 5, 6, 6, 7, 7],
  vocabularyPrecision: [6, 6, 7, 7, 7, 8, 8],
  verbAccuracy:        [5, 6, 6, 6, 7, 7, 7],
  argumentClosure:     [3, 4, 4, 5, 5, 5, 6],
  fillerUsage:         [4, 4, 5, 5, 5, 6, 6],
};

function getLevel(score: number): string {
  if (score <= 3) return 'low';
  if (score <= 6) return 'medium';
  return 'high';
}

async function seedMetrics(sessions: SpeakingSession[]): Promise<void> {
  for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i];
    if (!session) continue;
    for (const key of METRIC_KEYS) {
      const scores = BASE_SCORES[key];
      const score = scores?.[i] ?? scores?.[scores.length - 1] ?? 5;
      await prisma.metricSnapshot.create({
        data: {
          sessionId: session.id,
          key,
          level: getLevel(score),
          score,
          note: `Seed data for ${key} — session ${i + 1}`,
        },
      });
    }
  }
}

async function seed(): Promise<void> {
  console.log('🌱 Seeding dev data...\n');

  // Upsert dev user
  const user = await prisma.user.upsert({
    where: { externalId: DEV_USER.externalId },
    update: { email: DEV_USER.email, displayName: DEV_USER.displayName },
    create: DEV_USER,
  });
  console.log(`✅ User: ${user.id} (${user.displayName})`);

  // Clean up previous seed sessions for this user
  const existingSessions = await prisma.speakingSession.findMany({
    where: { userId: user.id },
    select: { id: true },
  });

  if (existingSessions.length > 0) {
    await prisma.drillAttempt.deleteMany({ where: { userId: user.id } });
    await prisma.speakingSession.deleteMany({
      where: { userId: user.id },
    });
    console.log(`🧹 Cleaned drills + ${existingSessions.length} previous session(s)`);
  }

  // Create DONE session
  const session = await prisma.speakingSession.create({
    data: {
      userId: user.id,
      status: SessionStatus.DONE,
      durationSecs: 180,
      language: 'en',
      topic: 'Daily routine and language learning habits',
      intentLabel: 'Language learning daily habits',
      summary: MOCK_SUMMARY,
      focusNext: MOCK_FOCUS_NEXT,
      focusMetricKey: 'connectorRepetition',
      audioDeletedAt: new Date(),
    },
  });
  console.log(`✅ Session: ${session.id} (DONE)`);

  // Create transcript
  const wordCount = MOCK_TRANSCRIPT.trim().split(/\s+/).length;
  await prisma.transcript.create({
    data: {
      sessionId: session.id,
      text: MOCK_TRANSCRIPT,
      wordCount,
    },
  });
  console.log(`✅ Transcript: ${wordCount} words`);

  // Create insights
  await prisma.insight.createMany({
    data: MOCK_INSIGHTS.map((insight) => ({
      sessionId: session.id,
      category: insight.category,
      pattern: insight.pattern,
      detail: insight.detail,
      frequency: insight.frequency,
      severity: insight.severity,
      examples: insight.examples,
      suggestion: insight.suggestion,
    })),
  });
  console.log(`✅ Insights: ${MOCK_INSIGHTS.length} patterns`);

  // Session 2 — yesterday, DONE
  const session2 = await prisma.speakingSession.create({
    data: {
      userId: user.id,
      status: 'DONE',
      durationSecs: 120,
      language: 'en',
      topic: 'Job interview preparation',
      intentLabel: 'Job interview practice',
      summary: 'Good fluency under pressure. Needs work on past tense consistency and formal register.',
      focusNext: 'Practice answering "Tell me about yourself" using past simple consistently.',
      audioDeletedAt: new Date(),
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
  });
  console.log(`✅ Session 2: ${session2.id} (DONE, yesterday)`);

  // Session 3 — 2 days ago, DONE
  const session3 = await prisma.speakingSession.create({
    data: {
      userId: user.id,
      status: 'DONE',
      durationSecs: 240,
      language: 'en',
      topic: 'Travel experiences',
      intentLabel: 'Travel stories sharing',
      summary: 'Rich vocabulary for describing places. Article usage still inconsistent.',
      focusNext: 'Practice using "the" with specific places you have already mentioned.',
      audioDeletedAt: new Date(),
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  });
  console.log(`✅ Session 3: ${session3.id} (DONE, 2 days ago)`);

  // Session 4 — 3 days ago, DONE
  const session4 = await prisma.speakingSession.create({
    data: {
      userId: user.id,
      status: 'DONE',
      durationSecs: 150,
      language: 'en',
      topic: 'Technology and AI',
      intentLabel: 'Technology trends discussion',
      summary: 'Good command of technical vocabulary. Sentence structures becoming more varied.',
      focusNext: 'Practice using passive voice for formal technical explanations.',
      audioDeletedAt: new Date(),
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
  });
  console.log(`✅ Session 4: ${session4.id} (DONE, 3 days ago)`);

  // Session 5 — 4 days ago, DONE
  const session5 = await prisma.speakingSession.create({
    data: {
      userId: user.id,
      status: 'DONE',
      durationSecs: 200,
      language: 'en',
      topic: 'Health and lifestyle',
      intentLabel: 'Health habits discussion',
      summary: 'Fluent delivery on familiar topics. Connector variety still limited.',
      focusNext: 'Replace "also" with "furthermore", "in addition", or "what\'s more".',
      audioDeletedAt: new Date(),
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    },
  });
  console.log(`✅ Session 5: ${session5.id} (DONE, 4 days ago)`);

  // Session 6 — 5 days ago, DONE
  const session6 = await prisma.speakingSession.create({
    data: {
      userId: user.id,
      status: 'DONE',
      durationSecs: 160,
      language: 'en',
      topic: 'Work and career goals',
      intentLabel: 'Career planning talk',
      summary: 'Strong argument structure emerging. Verb tense consistency still needs attention.',
      focusNext: 'Focus on consistent use of present perfect for recent events.',
      audioDeletedAt: new Date(),
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
  });
  console.log(`✅ Session 6: ${session6.id} (DONE, 5 days ago)`);

  // Session 7 — 6 days ago, DONE
  const session7 = await prisma.speakingSession.create({
    data: {
      userId: user.id,
      status: 'DONE',
      durationSecs: 130,
      language: 'en',
      topic: 'Education and learning strategies',
      intentLabel: 'Learning methods sharing',
      summary: 'Baseline performance. Room for improvement in all dimensions.',
      focusNext: 'Try to use at least 3 different discourse connectors in the next session.',
      audioDeletedAt: new Date(),
      createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    },
  });
  console.log(`✅ Session 7: ${session7.id} (DONE, 6 days ago)`);

  // Session 8 — today, FAILED (tests fallback label display — no intentLabel)
  const sessionFailed = await prisma.speakingSession.create({
    data: {
      userId: user.id,
      status: 'FAILED',
      durationSecs: 60,
      language: 'en',
      topic: 'Free conversation',
      errorMessage: 'Whisper transcription timed out',
      audioDeletedAt: new Date(),
    },
  });
  console.log(`✅ Session (FAILED): ${sessionFailed.id} (today — tests fallback)`);

  // Seed MetricSnapshot records for all DONE sessions in chronological order
  const doneSessions = [session7, session6, session5, session4, session3, session2, session];
  await seedMetrics(doneSessions);
  console.log(`✅ Metric snapshots: ${doneSessions.length * METRIC_KEYS.length} records`);

  // Create/update pattern profile
  const patterns: Record<string, number> = {};
  for (const insight of MOCK_INSIGHTS) {
    patterns[`${insight.category}:${insight.pattern}`] = insight.frequency;
  }

  await prisma.patternProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, patterns, lastUpdated: new Date() },
    update: { patterns, lastUpdated: new Date() },
  });
  console.log(`✅ Pattern profile updated`);

  console.log(`\n📊 Seeded 8 sessions across 7 days (7 DONE + 1 FAILED)`);

  const drillSeeds = [
    {
      userId: user.id,
      sessionId: session.id,
      drillType: 'rephrase',
      metricKey: 'connectorRepetition',
      prompt:
        'You said: "So I think that the problem is important, so we need to fix it." Try rephrasing this without using "so" — consider using "therefore", "as a result", or "consequently" instead.',
      sourceExample: 'So I think that the problem is important, so we need to fix it.',
      transcript: 'I believe the problem is significant, therefore we need to address it promptly.',
      feedback:
        'Great job eliminating the repeated "so" — your use of "therefore" sounds much more polished!',
      improved: true,
      createdAt: new Date('2026-03-28T10:00:00Z'),
      completedAt: new Date('2026-03-28T10:02:30Z'),
    },
    {
      userId: user.id,
      sessionId: session.id,
      drillType: 'vocabUpgrade',
      metricKey: 'vocabularyPrecision',
      prompt:
        'You used "good" three times in your response. Try re-explaining your point about the team using one of these alternatives: "effective", "proficient", or "collaborative".',
      sourceExample: 'The team was good and they did a good job on the good project.',
      transcript:
        'The team was effective and they delivered a proficient result on the collaborative project.',
      feedback: 'Solid upgrade — you replaced all three instances with distinct, precise alternatives.',
      improved: true,
      createdAt: new Date('2026-03-28T10:05:00Z'),
      completedAt: new Date('2026-03-28T10:06:30Z'),
    },
    {
      userId: user.id,
      sessionId: session2.id,
      drillType: 'constraint',
      metricKey: 'structuralVariety',
      prompt:
        'Use this structure: "Although [challenge], [positive outcome] because [reason]." Explain your recent experience with the new workflow using this exact pattern.',
      sourceExample: 'The new workflow was hard but we managed to finish it.',
      transcript:
        'Although the new workflow presented some challenges, we completed it ahead of schedule because the team adapted quickly.',
      feedback:
        'Perfect structure — your "although/because" framing adds real sophistication to the argument.',
      improved: true,
      createdAt: new Date('2026-03-29T14:00:00Z'),
      completedAt: new Date('2026-03-29T14:03:00Z'),
    },
    {
      userId: user.id,
      sessionId: session2.id,
      drillType: 'precision',
      metricKey: 'fillerUsage',
      prompt:
        'You said: "So, like, the thing is that we basically need to, you know, improve the process." Make this specific and concrete — what exactly needs improving and how?',
      sourceExample:
        'So, like, the thing is that we basically need to, you know, improve the process.',
      transcript:
        'We need to reduce the onboarding time from two weeks to five days by automating the document verification step.',
      feedback: 'Excellent — you went from vague to laser-focused with a specific metric and action!',
      improved: true,
      createdAt: new Date('2026-03-29T14:05:00Z'),
      completedAt: new Date('2026-03-29T14:07:00Z'),
    },
    {
      userId: user.id,
      sessionId: session2.id,
      drillType: 'conclusion',
      metricKey: 'argumentClosure',
      prompt:
        'You were discussing the benefits of remote work but trailed off. Deliver a strong 2-3 sentence conclusion that ties back to your main point about productivity.',
      sourceExample: 'So yeah, remote work is kind of... well it has its benefits and...',
      transcript:
        'So in terms of remote work, there are benefits, I think people can work better sometimes.',
      feedback:
        'You made a solid attempt — next time, try ending with a definitive statement that echoes your opening argument.',
      improved: false,
      createdAt: new Date('2026-03-29T14:10:00Z'),
      completedAt: new Date('2026-03-29T14:14:00Z'),
    },
    {
      userId: user.id,
      sessionId: session2.id,
      drillType: 'rephrase',
      metricKey: 'connectorRepetition',
      prompt:
        'You said: "Because the deadline was tight, because we had limited resources, we struggled." Try expressing this cause-effect relationship without repeating "because".',
      sourceExample:
        'Because the deadline was tight, because we had limited resources, we struggled.',
      transcript: null,
      feedback: null,
      improved: null,
      createdAt: new Date('2026-03-30T09:00:00Z'),
      completedAt: null,
    },
    {
      userId: user.id,
      sessionId: null,
      drillType: 'vocabUpgrade',
      metricKey: 'vocabularyPrecision',
      prompt:
        'You frequently use "important" — try replacing it with "critical", "essential", or "pivotal" in your next response about project priorities.',
      sourceExample:
        'This is important because the important thing is to focus on important tasks.',
      transcript: null,
      feedback: null,
      improved: null,
      createdAt: new Date('2026-03-30T09:05:00Z'),
      completedAt: null,
    },
  ];

  for (const drill of drillSeeds) {
    await prisma.drillAttempt.create({ data: drill });
  }
  console.log(`✅ Drill attempts: ${drillSeeds.length} seeded`);

  console.log('\n──────────────────────────────────────');
  console.log(`🔗 View results: http://localhost:3000/session/${session.id}`);
  console.log('──────────────────────────────────────\n');
}

seed()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
