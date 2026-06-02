// Dev seed script — inserts multiple sessions across days for visual testing of history + results UI
import { PrismaClient, SessionStatus } from '@prisma/client';
import type { SpeakingSession } from '@prisma/client';
import {
  DEV_USER,
  MOCK_TRANSCRIPT,
  MOCK_SUMMARY,
  MOCK_FOCUS_NEXT,
  MOCK_INSIGHTS,
  METRIC_KEYS,
  BASE_SCORES,
  SESSION_SEEDS,
  DRILL_SEEDS,
} from './seedData';

const prisma = new PrismaClient();

function getLevel(score: number): string {
  if (score <= 3) return 'low';
  if (score <= 6) return 'medium';
  return 'high';
}

// Seed MetricSnapshot rows for a list of sessions in chronological order
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

// Upsert dev user and purge any previous seed data
async function seedUser(): Promise<{ id: string }> {
  const user = await prisma.user.upsert({
    where: { externalId: DEV_USER.externalId },
    update: { email: DEV_USER.email, displayName: DEV_USER.displayName },
    create: DEV_USER,
  });
  console.log(`✅ User: ${user.id} (${user.displayName})`);

  const existingSessions = await prisma.speakingSession.findMany({
    where: { userId: user.id },
    select: { id: true },
  });

  if (existingSessions.length > 0) {
    await prisma.drillAttempt.deleteMany({ where: { userId: user.id } });
    await prisma.speakingSession.deleteMany({ where: { userId: user.id } });
    console.log(`🧹 Cleaned drills + ${existingSessions.length} previous session(s)`);
  }

  return user;
}

// Create the primary DONE session with transcript and insights
async function seedPrimarySession(userId: string): Promise<SpeakingSession> {
  const session = await prisma.speakingSession.create({
    data: {
      userId,
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

  const wordCount = MOCK_TRANSCRIPT.trim().split(/\s+/).length;
  await prisma.transcript.create({
    data: { sessionId: session.id, text: MOCK_TRANSCRIPT, wordCount },
  });
  console.log(`✅ Transcript: ${wordCount} words`);

  await prisma.insight.createMany({
    data: MOCK_INSIGHTS.map((insight) => ({
      sessionId: session.id,
      category: insight.category,
      pattern: insight.pattern,
      detail: insight.detail,
      frequency: insight.frequency,
      severity: insight.severity,
      examples: [...insight.examples],
      suggestion: insight.suggestion,
    })),
  });
  console.log(`✅ Insights: ${MOCK_INSIGHTS.length} patterns`);

  return session;
}

// Create historical DONE sessions and the terminal FAILED session
async function seedHistorySessions(userId: string): Promise<SpeakingSession[]> {
  const created: SpeakingSession[] = [];

  for (const def of SESSION_SEEDS) {
    const s = await prisma.speakingSession.create({
      data: {
        userId,
        status: 'DONE',
        durationSecs: def.durationSecs,
        language: 'en',
        topic: def.topic,
        intentLabel: def.intentLabel,
        summary: def.summary,
        focusNext: def.focusNext,
        audioDeletedAt: new Date(),
        createdAt: new Date(Date.now() - def.daysAgo * 24 * 60 * 60 * 1000),
      },
    });
    console.log(`✅ Session (${def.topic}): ${s.id} (DONE, ${def.daysAgo} day(s) ago)`);
    created.push(s);
  }

  const sessionFailed = await prisma.speakingSession.create({
    data: {
      userId,
      status: 'FAILED',
      durationSecs: 60,
      language: 'en',
      topic: 'Free conversation',
      errorMessage: 'Whisper transcription timed out',
      audioDeletedAt: new Date(),
    },
  });
  console.log(`✅ Session (FAILED): ${sessionFailed.id} (today — tests fallback)`);

  return created;
}

// Seed drill attempts tied to the two most recent sessions
async function seedDrills(
  userId: string,
  primarySession: SpeakingSession,
  secondSession: SpeakingSession,
): Promise<void> {
  const sessionIdFor = (ref: 'primary' | 'second' | null): string | null => {
    if (ref === 'primary') return primarySession.id;
    if (ref === 'second') return secondSession.id;
    return null;
  };

  for (const def of DRILL_SEEDS) {
    await prisma.drillAttempt.create({
      data: {
        userId,
        sessionId: sessionIdFor(def.sessionRef),
        drillType: def.drillType,
        metricKey: def.metricKey,
        prompt: def.prompt,
        sourceExample: def.sourceExample,
        transcript: def.transcript,
        feedback: def.feedback,
        improved: def.improved,
        createdAt: new Date(def.createdAt),
        completedAt: def.completedAt !== null ? new Date(def.completedAt) : null,
      },
    });
  }
  console.log(`✅ Drill attempts: ${DRILL_SEEDS.length} seeded`);
}

// Upsert pattern profile from mock insights
async function seedPatternProfile(userId: string): Promise<void> {
  const patterns: Record<string, number> = {};
  for (const insight of MOCK_INSIGHTS) {
    patterns[`${insight.category}:${insight.pattern}`] = insight.frequency;
  }

  await prisma.patternProfile.upsert({
    where: { userId },
    create: { userId, patterns, lastUpdated: new Date() },
    update: { patterns, lastUpdated: new Date() },
  });
  console.log(`✅ Pattern profile updated`);
}

async function seed(): Promise<void> {
  console.log('🌱 Seeding dev data...\n');

  const user = await seedUser();
  const primarySession = await seedPrimarySession(user.id);
  const historySessions = await seedHistorySessions(user.id);

  // historySessions is oldest-first; primarySession is today (newest)
  const doneSessions = [...historySessions, primarySession];
  await seedMetrics(doneSessions);
  console.log(`✅ Metric snapshots: ${doneSessions.length * METRIC_KEYS.length} records`);

  // secondSession = the most recent history session (yesterday = last in historySessions)
  const secondSession = historySessions[historySessions.length - 1] ?? primarySession;
  await seedDrills(user.id, primarySession, secondSession);

  await seedPatternProfile(user.id);

  console.log(`\n📊 Seeded ${doneSessions.length + 1} sessions (${doneSessions.length} DONE + 1 FAILED)`);
  console.log('\n──────────────────────────────────────');
  console.log(`🔗 View results: http://localhost:3000/session/${primarySession.id}`);
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
