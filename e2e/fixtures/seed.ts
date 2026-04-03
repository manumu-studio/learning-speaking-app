// e2e/fixtures/seed.ts — Prisma helpers to upsert/remove deterministic E2E data (matches synthetic auth externalId)
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Must match `e2eBypassSession` in `src/features/auth/auth.ts` — DB rows use `User.id` from this user. */
export const E2E_SYNTHETIC_EXTERNAL_ID = 'e2e-test-external-id';

export const SEED_SESSION_ID = 'e2e-seed-session-00000001';
export const SEED_DRILL_ID = 'e2e-seed-drill-000000001';

async function ensureE2eUser() {
  return prisma.user.upsert({
    where: { externalId: E2E_SYNTHETIC_EXTERNAL_ID },
    update: {
      email: 'e2e@test.local',
      displayName: 'E2E Test User',
    },
    create: {
      externalId: E2E_SYNTHETIC_EXTERNAL_ID,
      email: 'e2e@test.local',
      displayName: 'E2E Test User',
    },
  });
}

export async function seedCompletedSession(): Promise<string> {
  const user = await ensureE2eUser();

  await prisma.speakingSession.upsert({
    where: { id: SEED_SESSION_ID },
    update: {
      status: 'DONE',
      durationSecs: 120,
      language: 'en',
      topic: 'E2E Test Topic',
      intentLabel: 'describing test scenarios',
      summary:
        'The speaker discussed testing strategies with good structural variety.',
      focusMetricKey: 'structuralVariety',
      focusNext: 'Try using more varied connectors in your next session.',
      updatedAt: new Date(),
    },
    create: {
      id: SEED_SESSION_ID,
      userId: user.id,
      status: 'DONE',
      durationSecs: 120,
      language: 'en',
      topic: 'E2E Test Topic',
      intentLabel: 'describing test scenarios',
      summary:
        'The speaker discussed testing strategies with good structural variety.',
      focusMetricKey: 'structuralVariety',
      focusNext: 'Try using more varied connectors in your next session.',
    },
  });

  await prisma.transcript.upsert({
    where: { sessionId: SEED_SESSION_ID },
    update: {
      text: 'This is a test transcript for the E2E seeded session. The speaker talked about various testing strategies including unit tests and integration tests.',
      wordCount: 22,
    },
    create: {
      sessionId: SEED_SESSION_ID,
      text: 'This is a test transcript for the E2E seeded session. The speaker talked about various testing strategies including unit tests and integration tests.',
      wordCount: 22,
    },
  });

  const metrics = [
    { key: 'connectorRepetition', level: 'developing', score: 5 },
    { key: 'structuralVariety', level: 'strong', score: 8 },
    { key: 'vocabularyPrecision', level: 'developing', score: 6 },
    { key: 'verbAccuracy', level: 'strong', score: 7 },
    { key: 'argumentClosure', level: 'emerging', score: 4 },
    { key: 'fillerUsage', level: 'strong', score: 9 },
  ] as const;

  for (const m of metrics) {
    await prisma.metricSnapshot.upsert({
      where: {
        sessionId_key: { sessionId: SEED_SESSION_ID, key: m.key },
      },
      update: {
        level: m.level,
        score: m.score,
        note: `E2E seed note for ${m.key}`,
      },
      create: {
        sessionId: SEED_SESSION_ID,
        key: m.key,
        level: m.level,
        score: m.score,
        note: `E2E seed note for ${m.key}`,
      },
    });
  }

  return SEED_SESSION_ID;
}

export async function seedCompletedDrill(): Promise<string> {
  await seedCompletedSession();
  const user = await ensureE2eUser();

  await prisma.drillAttempt.upsert({
    where: { id: SEED_DRILL_ID },
    update: {
      userId: user.id,
      sessionId: SEED_SESSION_ID,
      drillType: 'rephrase',
      metricKey: 'connectorRepetition',
      prompt:
        'Rephrase the following using a different connector: "So I think testing is important."',
      sourceExample: 'So I think testing is important.',
      transcript: 'Therefore, I believe testing holds significant value.',
      feedback:
        'Great improvement! You replaced "so" with "therefore" and added more precise vocabulary.',
      improved: true,
      completedAt: new Date(),
    },
    create: {
      id: SEED_DRILL_ID,
      userId: user.id,
      sessionId: SEED_SESSION_ID,
      drillType: 'rephrase',
      metricKey: 'connectorRepetition',
      prompt:
        'Rephrase the following using a different connector: "So I think testing is important."',
      sourceExample: 'So I think testing is important.',
      transcript: 'Therefore, I believe testing holds significant value.',
      feedback:
        'Great improvement! You replaced "so" with "therefore" and added more precise vocabulary.',
      improved: true,
      completedAt: new Date(),
    },
  });

  return SEED_DRILL_ID;
}

export async function cleanupSeedData(): Promise<void> {
  await prisma.drillAttempt.deleteMany({ where: { id: SEED_DRILL_ID } });
  await prisma.metricSnapshot.deleteMany({ where: { sessionId: SEED_SESSION_ID } });
  await prisma.insight.deleteMany({ where: { sessionId: SEED_SESSION_ID } });
  await prisma.transcript.deleteMany({ where: { sessionId: SEED_SESSION_ID } });
  await prisma.speakingSession.deleteMany({ where: { id: SEED_SESSION_ID } });
}

export { prisma };
