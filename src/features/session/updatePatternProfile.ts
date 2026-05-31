// Utility for aggregating pattern insights into user pattern profiles
import { prisma } from '@/lib/prisma';
import { PatternProfilePatternsSchema } from '@/lib/schemas/jsonFields';

interface PatternInsight {
  category: string;
  pattern: string;
  frequency?: number | null | undefined;
}

// Create or update user's pattern profile with new session insights
export async function updatePatternProfile(
  userId: string,
  insights: PatternInsight[]
): Promise<void> {
  const existing = await prisma.patternProfile.findUnique({
    where: { userId },
  });

  // Validate patterns JSON field via Zod — graceful default on parse failure
  const parsed = PatternProfilePatternsSchema.safeParse(existing?.patterns);
  const patterns: Record<string, number> = parsed.success ? { ...parsed.data } : {};

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
