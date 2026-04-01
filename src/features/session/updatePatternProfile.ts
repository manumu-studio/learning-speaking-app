// Utility for aggregating pattern insights into user pattern profiles
import { prisma } from '@/lib/prisma';

interface PatternInsight {
  category: string;
  pattern: string;
  frequency?: number | undefined;
}

// Create or update user's pattern profile with new session insights
export async function updatePatternProfile(
  userId: string,
  insights: PatternInsight[]
): Promise<void> {
  const existing = await prisma.patternProfile.findUnique({
    where: { userId },
  });

  // Parse from Prisma JsonValue — patterns are stored as { "category:pattern": count }
  const rawPatterns: unknown = existing?.patterns;
  const patterns: Record<string, number> =
    rawPatterns !== null && rawPatterns !== undefined && typeof rawPatterns === 'object' && !Array.isArray(rawPatterns)
      ? Object.fromEntries(
          Object.entries(rawPatterns).filter(([, v]) => typeof v === 'number')
        )
      : {};

  for (const insight of insights) {
    const key = `${insight.category}:${insight.pattern}`;
    patterns[key] = (patterns[key] ?? 0) + (insight.frequency ?? 1);
  }

  await prisma.patternProfile.upsert({
    where: { userId },
    create: {
      userId,
      patterns,
      lastUpdated: new Date(),
    },
    update: {
      patterns,
      lastUpdated: new Date(),
    },
  });
}
