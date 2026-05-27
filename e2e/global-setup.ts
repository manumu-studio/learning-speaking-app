// Global setup — ensure E2E user exists with onboardedAt before any test runs
import { PrismaClient } from '@prisma/client';

const E2E_SYNTHETIC_EXTERNAL_ID = 'e2e-test-external-id';

export default async function globalSetup() {
  const prisma = new PrismaClient();
  try {
    await prisma.user.upsert({
      where: { externalId: E2E_SYNTHETIC_EXTERNAL_ID },
      update: { onboardedAt: new Date() },
      create: {
        externalId: E2E_SYNTHETIC_EXTERNAL_ID,
        email: 'e2e@test.local',
        displayName: 'E2E Test User',
        onboardedAt: new Date(),
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}
