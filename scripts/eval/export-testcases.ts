// scripts/eval/export-testcases.ts
// Reads GoldenSession rows from Prisma and writes eval/testcases.json for Promptfoo.
// Run: tsx scripts/eval/export-testcases.ts

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import crypto from 'node:crypto';
import { prisma } from '../../src/lib/prisma';

// ---------------------------------------------------------------------------
// Promptfoo test-case shape
// ---------------------------------------------------------------------------

interface PromptfooTestCase {
  description: string;
  vars: Record<string, string | number | null>;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  try {
    // GoldenSession stores the judge's replay inputs directly (denormalized frozen
    // snapshot) - read the fields off the row, no relation include needed.
    const goldenSessions = await prisma.goldenSession.findMany({
      orderBy: { createdAt: 'asc' },
    });

    if (goldenSessions.length === 0) {
      console.warn('No GoldenSession rows found. Seed the golden set before exporting.');
      process.exit(0);
    }

    const testCases: PromptfooTestCase[] = goldenSessions.map((gs) => {
      const transcript = gs.cleanTranscript;
      const promptUsed = gs.promptUsed ?? '';
      const promptHash = crypto.createHash('sha256').update(promptUsed).digest('hex');

      // pronunciationSummary is stored as a JSON string on GoldenSession (String? db.Text)
      const pronunciationSummary = gs.pronunciationSummary ?? null;

      return {
        // Human-readable label shown in Promptfoo output table
        description: `GoldenSession ${gs.id} | focus: ${gs.focusMetricKey ?? 'none'}`,
        vars: {
          goldenId: gs.id,
          transcript,
          promptUsed,
          promptHash,
          focusMetricKey: gs.focusMetricKey ?? '',
          pronunciationSummary,
          modelPin: 'claude-haiku-4-5-20251001',
          runIndex: 0,
        },
      };
    });

    // Ensure the eval/ directory exists
    const evalDir = join(process.cwd(), 'eval');
    mkdirSync(evalDir, { recursive: true });

    const outputPath = join(evalDir, 'testcases.json');
    writeFileSync(outputPath, JSON.stringify(testCases, null, 2), 'utf-8');

    console.log(`Wrote ${testCases.length} test case(s) to ${outputPath}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
