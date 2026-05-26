// Claude Haiku client for analyzing transcripts and detecting recurring patterns
import { z } from 'zod';
import { getAnthropicClient } from '@/lib/ai/client';
import { isSpeakingMetricKey } from '@/lib/metric-keys';

export const transcriptionArtefactSchema = z.object({
  word: z.string(),
  context: z.string(),
});

// Claude response insight shape — Prisma fields plus optional confidence (stripped before DB write)
export const insightSchema = z.object({
  category: z.enum(['grammar', 'vocabulary', 'structure']),
  pattern: z.string(),
  detail: z.string(),
  frequency: z.number().optional(),
  severity: z.enum(['high', 'medium', 'low']).optional(),
  examples: z.array(z.string()).optional(),
  suggestion: z.string().optional(),
  confidence: z.number().min(1).max(5).optional(),
});

// Metric scoring schema — accepts 6 Claude-scored keys + 3 Azure-computed keys (for schema completeness)
export const metricSchema = z.object({
  key: z.enum([
    'connectorRepetition',
    'structuralVariety',
    'vocabularyPrecision',
    'verbAccuracy',
    'argumentClosure',
    'fillerUsage',
    'pronunciationAccuracy',
    'prosodyScore',
    'speakingRate',
  ]),
  level: z.enum(['low', 'medium', 'high']),
  score: z.number().min(1).max(10),
  note: z.string(),
});

/** Parsed Claude output for one session — must match downstream Prisma writes and dashboard metrics. */
export const analysisResultSchema = z.object({
  insights: z.array(insightSchema).max(5),
  metrics: z.array(metricSchema),
  focusNext: z.string(),
  summary: z.string(),
  intentLabel: z.string(),
  possible_transcription_artefacts: z.array(transcriptionArtefactSchema).optional(),
});

export type AnalysisResult = z.infer<typeof analysisResultSchema>;
export type Insight = z.infer<typeof insightSchema>;

/** Lean Azure pronunciation data passed to Claude as context — not scored by Claude. */
export type PronunciationSummary = {
  topWeakPhonemes: string[];
  l1Tags: string[];
  accuracyScore: number;
  prosodyScore: number;
};

// Metric key to human-readable label mapping
const METRIC_LABELS: Record<string, string> = {
  connectorRepetition: 'Connector Repetition',
  structuralVariety: 'Structural Variety',
  vocabularyPrecision: 'Vocabulary Precision',
  verbAccuracy: 'Verb Accuracy',
  argumentClosure: 'Argument Closure',
  fillerUsage: 'Filler Usage',
};

function buildFocusInstruction(focusMetricKey: string): string {
  const label = METRIC_LABELS[focusMetricKey] ?? focusMetricKey;
  return `FOCUS PRIORITY: The user is specifically training "${label}". Pay extra attention to this area in your analysis. In focusNext, reference progress on this specific metric and suggest concrete next steps for improvement.\n\n`;
}

const ASR_GUARD_PROMPT = `The transcript below was produced by OpenAI Whisper, which has well-documented failure modes:
- It sometimes substitutes near-homophones for low-frequency words, especially proper nouns and technical terms.
- It sometimes invents text during speaker pauses.
- It performs worse on accented and spontaneous L2 English than on native read speech.

HARD RULES — do not violate these:
- NEVER flag a proper noun, brand name, person name, product name, or technical term as a vocabulary or spelling error. Exclude these entirely from vocabulary analysis.
- NEVER flag a word that appears only ONCE in the transcript as a recurring learner pattern. Single instances are slips, transcription artefacts, or noise — not patterns.
- NEVER flag any word wrapped in ⟨?...?⟩ — these are low-confidence transcriptions. Treat them as unknown.
- If your confidence that an issue is a genuine learner error (not a transcription artefact) is below 4 out of 5, do not surface it in insights.
- Each insight must include at least 2 example quotes from the transcript (frequency floor enforcement).
- List suspected ASR mistakes separately in possible_transcription_artefacts — never as learner errors.

`;

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
- intentLabel: A concise 3-5 word label describing the main topic of this conversation (e.g., "Daily routine discussion", "Job interview practice", "Travel experiences sharing")

Score ONLY these 6 metrics on a 1-10 scale (10 = native-like proficiency):
connectorRepetition, structuralVariety, vocabularyPrecision, verbAccuracy, argumentClosure, fillerUsage.
For each metric provide: key, level (low=1-3, medium=4-6, high=7-10), score (1-10), note (one sentence observation).
Do NOT score pronunciationAccuracy, prosodyScore, or speakingRate — those are computed separately from Azure data.

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
  "metrics": [
    {
      "key": "connectorRepetition" | "structuralVariety" | "vocabularyPrecision" | "verbAccuracy" | "argumentClosure" | "fillerUsage",
      // DO NOT include pronunciationAccuracy, prosodyScore, or speakingRate
      "level": "low" | "medium" | "high",
      "score": number,
      "note": "string"
    }
  ],
  "focusNext": "string",
  "summary": "string",
  "intentLabel": "string",
  "possible_transcription_artefacts": [
    { "word": "string", "context": "string" }
  ]
}`;

// Match ⟨?...?⟩ markers — [^⟩]* allows question marks inside suspect transcript text
const SUSPECT_MARKER_PATTERN = /⟨\?[^⟩]*\?⟩/;

function insightReferencesSuspectMarkers(insight: Insight): boolean {
  const fields = [insight.pattern, insight.detail, ...(insight.examples ?? [])];
  return fields.some((field) => SUSPECT_MARKER_PATTERN.test(field));
}

function insightBelowConfidenceFloor(insight: Insight): boolean {
  return insight.confidence != null && insight.confidence < 4;
}

function insightBelowFrequencyFloor(insight: Insight): boolean {
  if (insight.frequency != null && insight.frequency < 2) {
    return true;
  }
  if (insight.examples != null && insight.examples.length < 2) {
    return true;
  }
  return false;
}

/** Programmatic guardrails applied after Claude parse — mirrors prompt hard rules. */
export function applyInsightGuardrails(insights: Insight[]): Insight[] {
  return insights.filter((insight) => {
    if (insightReferencesSuspectMarkers(insight)) {
      return false;
    }
    if (insightBelowConfidenceFloor(insight)) {
      return false;
    }
    if (insightBelowFrequencyFloor(insight)) {
      return false;
    }
    return true;
  });
}

function buildPronunciationContext(summary: PronunciationSummary): string {
  const phonemeList =
    summary.topWeakPhonemes.length > 0
      ? summary.topWeakPhonemes.join(', ')
      : 'none detected';

  const l1TagList =
    summary.l1Tags.length > 0
      ? summary.l1Tags.join(', ')
      : 'none detected';

  return `
PRONUNCIATION CONTEXT (from Azure Speech Assessment -- do NOT score these):
- Overall pronunciation accuracy: ${summary.accuracyScore.toFixed(0)}/100
- Prosody naturalness: ${summary.prosodyScore.toFixed(0)}/100
- Weak phonemes (below 60% accuracy): ${phonemeList}
- Spanish L1 interference patterns detected: ${l1TagList}

If any patterns above are strong (e.g., recurring phoneme errors or clear L1 interference), include 1-2 brief pronunciation observations in your insights section. Frame all pronunciation feedback using intelligibility-first language:
- Good: "your /b/-for-/v/ substitution is understandable but a learnable target"
- Avoid: "mispronunciation" or "incorrect"
Do NOT produce numeric scores for pronunciation -- those are computed separately.
`.trim();
}

// Analyze transcript using Claude Haiku — returns structured insights validated against Prisma schema
export async function analyzeTranscript(
  transcript: string,
  focusMetricKey?: string | null,
  pronunciationSummary?: PronunciationSummary | null,
): Promise<AnalysisResult> {
  const client = getAnthropicClient();

  // Build prompt with optional focus instruction and optional pronunciation context
  let prompt = '';
  if (focusMetricKey && isSpeakingMetricKey(focusMetricKey)) {
    prompt += buildFocusInstruction(focusMetricKey);
  }

  const pronunciationContext =
    pronunciationSummary != null
      ? `\n\n${buildPronunciationContext(pronunciationSummary)}`
      : '';

  prompt += `${ASR_GUARD_PROMPT}${ANALYSIS_PROMPT}${pronunciationContext}\n\nTranscript:\n${transcript}`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const content = message.content[0] ?? null;
  if (content === null || content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  // Strip markdown code fences Claude sometimes wraps around JSON
  const rawText = content.text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  // Parse and validate response with Zod — throws ZodError on schema mismatch
  const parsed: unknown = JSON.parse(rawText);
  const validated = analysisResultSchema.parse(parsed);

  return {
    ...validated,
    insights: applyInsightGuardrails(validated.insights),
  };
}
