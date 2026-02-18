# PACKET-07b: Claude Analysis Client + Zod Schema

**Recommended model**: Sonnet 4.6 Thinking

---

You are building PACKET-07b for the Learning Speaking App. Follow all rules in `.cursorrules`.

## Scope

**Files to CREATE:**
- `src/lib/ai/analyze.ts` — Claude analysis client + prompt + Zod schema

**Files to MODIFY:** NONE

**Dependencies to install:**
```bash
npm install @anthropic-ai/sdk
```

---

## Critical: Prisma Schema Mapping

The analysis output MUST map to these EXACT Prisma field names:

### Insight model
```prisma
model Insight {
  id         String   @id @default(cuid())
  sessionId  String
  category   String         // ✅ maps to: 'grammar' | 'vocabulary' | 'structure'
  pattern    String         // ✅ pattern name
  detail     String @db.Text // ✅ explanation
  frequency  Int?            // ✅ optional count
  severity   String?         // ✅ optional: 'high' | 'medium' | 'low'
  examples   Json?           // ✅ optional JSON array of strings
  suggestion String? @db.Text // ✅ optional improvement suggestion
  session    SpeakingSession @relation(...)
  @@index([sessionId])
}
```

### SpeakingSession.focusNext
```prisma
model SpeakingSession {
  // ...
  focusNext String? @db.Text // ✅ ONE actionable focus for next session
  // ...
}
```

---

## File: `src/lib/ai/analyze.ts`

```typescript
// Claude Haiku client for analyzing transcripts and detecting recurring patterns
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { env } from '@/lib/env';

// Runtime validation — ANTHROPIC_API_KEY is optional in env.ts but required here
function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Configure Anthropic credentials to enable analysis.`
    );
  }
  return value;
}

// Lazy singleton — initialized on first use to avoid build-time crashes
let _anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (_anthropicClient) {
    return _anthropicClient;
  }

  const apiKey = requireEnv(env.ANTHROPIC_API_KEY, 'ANTHROPIC_API_KEY');
  _anthropicClient = new Anthropic({ apiKey });
  return _anthropicClient;
}

// Zod schema matching Prisma Insight model fields EXACTLY
const insightSchema = z.object({
  category: z.enum(['grammar', 'vocabulary', 'structure']),
  pattern: z.string(),
  detail: z.string(),
  frequency: z.number().optional(),
  severity: z.enum(['high', 'medium', 'low']).optional(),
  examples: z.array(z.string()).optional(),
  suggestion: z.string().optional(),
});

const analysisResultSchema = z.object({
  insights: z.array(insightSchema).max(5),
  focusNext: z.string(),
  summary: z.string(),
});

export type AnalysisResult = z.infer<typeof analysisResultSchema>;
export type Insight = z.infer<typeof insightSchema>;

const ANALYSIS_PROMPT = `You are an English language pattern analyzer for B2-C1+ English learners practicing speaking.

Your task: Analyze this transcript and identify the TOP 3-5 RECURRING patterns (not isolated mistakes). Focus on habits that appear multiple times across the session.

Pattern categories:
- grammar: repeated misuse of tenses, articles, prepositions, subject-verb agreement
- vocabulary: overused filler words, limited connector variety, repetitive word choice
- structure: repetitive sentence starters, complexity avoidance, monotonous rhythm

For each pattern found, provide:
- category: 'grammar' | 'vocabulary' | 'structure'
- pattern: Clear name (e.g., "Missing articles before nouns", "Overuse of 'so' as connector")
- detail: Brief explanation (1-2 sentences)
- frequency: Approximate count of occurrences in transcript
- severity: 'high' | 'medium' | 'low' (based on impact on clarity and naturalness)
- examples: Array of 2-3 exact quotes from transcript showing the pattern
- suggestion: ONE specific, actionable improvement tip

Also provide:
- focusNext: ONE concrete focus area for the next speaking session (specific and measurable, e.g., "Practice using 'however' and 'in contrast' instead of 'but' and 'so'")
- summary: 2-3 sentence overall assessment of speaking proficiency and main strengths/weaknesses

CRITICAL: Respond with ONLY valid JSON. No markdown, no explanations. Just the JSON object.

Schema:
{
  "insights": [
    {
      "category": "grammar" | "vocabulary" | "structure",
      "pattern": "string",
      "detail": "string",
      "frequency": number,
      "severity": "high" | "medium" | "low",
      "examples": ["string", "string"],
      "suggestion": "string"
    }
  ],
  "focusNext": "string",
  "summary": "string"
}`;

/**
 * Analyze transcript using Claude Haiku
 * @param transcript - Full transcript text from Whisper
 * @returns Structured analysis with insights, focusNext, and summary
 */
export async function analyzeTranscript(
  transcript: string
): Promise<AnalysisResult> {
  const client = getAnthropicClient();

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `${ANALYSIS_PROMPT}\n\nTranscript:\n${transcript}`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  // Parse and validate response with Zod
  const parsed = JSON.parse(content.text);
  return analysisResultSchema.parse(parsed);
}
```

---

## Validation

After creating this file, run:

```bash
npx tsc --noEmit
npm run build
```

Both commands must succeed with zero errors.

---

## Key Implementation Notes

1. **Model**: Using `claude-haiku-4-5-20251001` (cheaper, faster for MVP — can upgrade to Sonnet later if needed).

2. **Zod schema matches Prisma EXACTLY**: Every field in `insightSchema` maps directly to the Prisma `Insight` model. No field name mismatches.

3. **Lazy singleton pattern**: Consistent with `qstash.ts` and `whisper.ts` (runtime validation, prevents build-time crashes).

4. **Prompt focuses on PATTERNS, not corrections**: The AI is instructed to find recurring habits across the transcript, not to correct every sentence. This is appropriate for B2-C1+ learners who need pattern awareness, not sentence-by-sentence correction.

5. **Max 5 insights**: Prevents overwhelming the user with too much feedback.

6. **JSON-only response**: Prompt explicitly requests JSON without markdown formatting. We parse and validate with Zod.

---

## Documentation

Create journal entry at `docs/journal/ENTRY-07b.md`:

```markdown
# ENTRY-07b — Claude Analysis Integration

**Date**: 2026-02-18
**Type**: Feature
**Branch**: feature/processing-pipeline
**Version**: 0.7.0

## Summary

Integrated Claude Haiku for transcript analysis with Zod-validated schema matching Prisma models.

## Files Created

- `src/lib/ai/analyze.ts` — Claude client + analysis prompt + Zod schema

## Key Decisions

1. **Model selection**: Using `claude-haiku-4-5-20251001` for cost efficiency in MVP. Fast enough for async processing, accurate enough for pattern detection.

2. **Pattern-focused analysis**: Prompt instructs Claude to find RECURRING patterns (not correct every sentence). Appropriate for B2-C1+ learners who benefit from awareness of habits, not micro-corrections.

3. **Zod schema matches Prisma EXACTLY**: Every field in `insightSchema` maps directly to Prisma `Insight` model fields:
   - `category` → String (validated as enum)
   - `pattern` → String
   - `detail` → String (db.Text)
   - `frequency` → Int? (optional)
   - `severity` → String? (optional, validated as enum)
   - `examples` → Json? (optional, array of strings)
   - `suggestion` → String? (optional, db.Text)

4. **Max 5 insights**: Prevents cognitive overload. Users get focused, actionable feedback.

5. **focusNext field**: Provides ONE concrete goal for next session (stored in `SpeakingSession.focusNext`).

## Dependencies Added

- `@anthropic-ai/sdk` — Official Anthropic SDK for Claude API

## Next Steps

- PACKET-07c: Create webhook handler + wire QStash trigger + pattern profile updater
```

---

**DO NOT**:
- Modify `env.ts` (ANTHROPIC_API_KEY already present)
- Install other dependencies (only `@anthropic-ai/sdk`)
- Use wrong field names (e.g., `description` instead of `detail`, `count` instead of `frequency`)
- Create any other files

**References**: See `.cursorrules` for TypeScript standards, file header requirements, and Zod validation patterns.
Include documentation file creation in the  (journal, build report, PR doc, roadmap update) following this standars @_docs/journal @_docs/pull-requests @_docs/roadmap @_docs/ARCHITECTURE.md @_docs/SECURITY.md 

