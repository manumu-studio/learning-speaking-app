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

// Analyze transcript using Claude Haiku — returns structured insights validated against Prisma schema
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

  const content = message.content[0] ?? null;
  if (content === null || content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  // Parse and validate response with Zod — throws ZodError on schema mismatch
  const parsed: unknown = JSON.parse(content.text);
  return analysisResultSchema.parse(parsed);
}
