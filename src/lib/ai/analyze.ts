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
  coherenceScore: z
    .object({
      score: z.number().min(1).max(10),
      topicDevelopment: z.string(),
      logicalFlow: z.string(),
      discourseMarkersUsed: z.array(z.string()),
      discourseMarkersRecommended: z.array(z.string()),
    })
    .optional(),
  vocabularyDiversity: z
    .object({
      typeTokenRatio: z.number().min(0).max(1),
      academicWordCount: z.number().int().nonnegative(),
      repetitionFlags: z.array(
        z.object({
          word: z.string(),
          count: z.number().int().min(2),
          alternatives: z.array(z.string()).min(2).max(5),
        }),
      ),
    })
    .optional(),
  l1Interference: z
    .array(
      z.object({
        type: z.enum(['calque', 'false_cognate', 'syntax_pattern']),
        detected: z.string(),
        explanation: z.string(),
        suggestion: z.string(),
      }),
    )
    .optional(),
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

const COHERENCE_PROMPT_SECTION = `
COHERENCE AND DISCOURSE ANALYSIS:
Analyze how well the user structures their response at the discourse level — beyond grammar.

Evaluate:
- Topic development: Did they introduce, support, and conclude a point? Or jump between unrelated ideas?
- Logical flow: Are transitions smooth? Does each sentence connect to the next?
- Discourse marker usage: Which connectors did they actually use (e.g., "however", "therefore", "in contrast", "on the other hand", "as a result", "that said")? Which would have improved clarity?

Produce a coherenceScore object:
{
  "score": <1-10, where 10 is native-like coherent argumentation>,
  "topicDevelopment": "<one sentence observation>",
  "logicalFlow": "<one sentence observation>",
  "discourseMarkersUsed": ["<exact token from transcript>"],
  "discourseMarkersRecommended": ["<2-3 markers suited to their content>"]
}

Base score rubric:
- 1-3: Multiple topic jumps, no connectors, thoughts feel incomplete
- 4-6: Some structure visible, basic connectors ("and", "but", "so"), one developed point
- 7-10: Clear topic arc, varied connectors, ideas build on each other
`;

const VOCABULARY_DIVERSITY_PROMPT_SECTION = `
VOCABULARY DIVERSITY ANALYSIS:
Analyze the richness and precision of the user's vocabulary choices.

Tasks:
1. Estimate the type-token ratio (TTR): count unique content words / total content words. Exclude function words (articles, prepositions, auxiliaries) from this count.
2. Count how many Academic Word List (AWL) words appear — words at Tier 2 or above: e.g., "establish", "significant", "demonstrate", "contribute", "indicate", "argue", "fundamental". Basic words like "good", "big", "thing", "say" are NOT academic.
3. Flag every content word used 3 or more times that has more precise alternatives. For each flagged word, suggest 2-5 specific replacements suited to the context.

Produce a vocabularyDiversity object:
{
  "typeTokenRatio": <0.0-1.0>,
  "academicWordCount": <integer>,
  "repetitionFlags": [
    {
      "word": "<overused word>",
      "count": <how many times it appears>,
      "alternatives": ["<specific alternative 1>", "<specific alternative 2>"]
    }
  ]
}

Rules:
- Only flag words that have genuinely better alternatives. Never flag proper nouns.
- Alternatives must suit the actual context — don't suggest "optimal" when the user was talking about a meal.
- If TTR >= 0.65 and repetitionFlags is empty, say so positively in the summary.
`;

const L1_INTERFERENCE_PROMPT_SECTION = `
L1 SPANISH INTERFERENCE DETECTION:
The speaker is a native Spanish speaker. Analyze the transcript for text-level Spanish interference patterns that would not appear in native English speech.

Look specifically for:

1. CALQUES (direct word-for-word translations from Spanish):
   - "I have hunger/thirst/cold/heat" → should be "I am hungry/thirsty/cold/hot"
   - "I have X years" → should be "I am X years old"
   - "It makes me grace/laughter" → should be "I find it funny / it makes me laugh"
   - "In the end" used as "finally/eventually" when it means "at the end of a specific thing"
   - "Do the favor" → should be "do me a favor / please"

2. FALSE COGNATES (Spanish word misused based on surface similarity to English):
   - "sensible" used to mean "sensitive" (Spanish: sensible = sensitive)
   - "sympathetic" used to mean "likeable/nice" (Spanish: simpático = likeable)
   - "eventual" used to mean "possible" (Spanish: eventual = possible/contingent)
   - "actually" used as a discourse marker meaning "in fact" — this one IS a match; skip it
   - "embarrassed" vs "embarazada" — confirm the intended meaning from context

3. SPANISH SYNTAX PATTERNS:
   - Adjective placed after the noun ("the car red", "a problem big")
   - Overuse of "to be" where English uses "to have" (ser/estar confusion in tense)
   - "Since X time" to express a state that started in the past and continues ("I am here since Monday" → "I have been here since Monday")
   - Missing article where Spanish would also omit it — but English requires one

For each detected interference:
{
  "type": "calque" | "false_cognate" | "syntax_pattern",
  "detected": "<exact phrase from transcript>",
  "explanation": "<one sentence: what the Spanish source is and why this is interference>",
  "suggestion": "<the natural English equivalent>"
}

IMPORTANT:
- Only flag items you are confident (>= 4/5) are genuine L1 interference, not typos or conscious stylistic choices.
- Do NOT flag items already caught by the grammar insights array.
- Return an empty array if no interference patterns are found — do not invent them.
`;

const TONE_CALIBRATION_RULES = `
FEEDBACK TONE RULES — apply to all text fields: detail, suggestion, focusNext, summary, topicDevelopment, logicalFlow, explanation.

ALWAYS:
- Lead with what the user did well before naming the gap (e.g., "Your ideas were clear — the next step is to vary the connectors you use to link them.")
- Frame corrections as learnable targets, not deficiencies (e.g., "A useful next step is..." not "You failed to...")
- Be specific: name the exact pattern and give one concrete example from the transcript.
- Use "you" to address the user directly — this is personal coaching, not a report.
- Keep each field concise: detail = 1-2 sentences, suggestion = 1 sentence, focusNext = 1-2 sentences.

NEVER:
- Start with a negative judgment ("The speaker exhibits weak...")
- Use passive voice to distance the feedback ("mistakes were made")
- Use filler praise ("Great job overall!") without a specific observation to back it up
- Use the word "incorrect" — prefer "a natural next step" or "sounds more natural as"
- Use the word "mispronunciation" — prefer "a learnable target" or "understandable but improvable"

SUMMARY FIELD PATTERN:
"[Positive observation about what came through clearly]. [One main growth area]. [One encouraging statement about the trajectory]."
Example: "Your ideas about the topic came through clearly and you maintained a consistent pace. The main growth area is connector variety — you relied on 'and' and 'so' throughout. Adding two or three new connectors to your repertoire will immediately lift your fluency score."

FOCUS_NEXT FIELD PATTERN:
"[Specific, measurable action]. [Why it matters in context]. [Optional: reference to a previous session gain if pronunciation context includes prior score]."
Example: "In your next session, try replacing 'so' with 'as a result' or 'therefore' at least twice. This one change addresses the connector repetition pattern and will directly improve your Connector Repetition metric score."
`;

const ANALYSIS_ROLE_SECTION = `You are an English language pattern analyzer for B2-C1+ English learners practicing speaking.`;

const PATTERN_ANALYSIS_SECTION = `Your task: Analyze this transcript and identify the TOP 3-5 RECURRING patterns (not isolated mistakes). Focus on habits that appear multiple times across the session.

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
- summary: 2-3 sentences following the SUMMARY FIELD PATTERN from your system instructions. Lead positive, name one growth area, close encouraging.
- intentLabel: A concise 3-5 word label describing the main topic of this conversation (e.g., "Daily routine discussion", "Job interview practice", "Travel experiences sharing")

Score ONLY these 6 metrics on a 1-10 scale (10 = native-like proficiency):
connectorRepetition, structuralVariety, vocabularyPrecision, verbAccuracy, argumentClosure, fillerUsage.
For each metric provide: key, level (low=1-3, medium=4-6, high=7-10), score (1-10), note (one sentence observation).
Do NOT score pronunciationAccuracy, prosodyScore, or speakingRate — those are computed separately from Azure data.`;

const JSON_OUTPUT_SCHEMA = `Schema:
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
  ],
  "coherenceScore": {
    "score": number,
    "topicDevelopment": "string",
    "logicalFlow": "string",
    "discourseMarkersUsed": ["string"],
    "discourseMarkersRecommended": ["string"]
  },
  "vocabularyDiversity": {
    "typeTokenRatio": number,
    "academicWordCount": number,
    "repetitionFlags": [
      { "word": "string", "count": number, "alternatives": ["string"] }
    ]
  },
  "l1Interference": [
    {
      "type": "calque" | "false_cognate" | "syntax_pattern",
      "detected": "string",
      "explanation": "string",
      "suggestion": "string"
    }
  ]
}`;

const COT_INSTRUCTIONS = `Think step by step before producing JSON. Do NOT include your thinking in the output — only produce the final JSON object.

Step 1: Read the transcript and identify the speaker's main topic and intent.
Step 2: Count discourse markers, identify topic shifts, assess coherence flow.
Step 3: Count word frequencies, identify overused content words, estimate TTR.
Step 4: Scan for Spanish interference patterns (calques, false cognates, syntax).
Step 5: Identify recurring grammar, vocabulary, and structure patterns.
Step 6: Score all 6 metrics based on your observations above.
Step 7: Write focusNext, summary, and intentLabel.
Step 8: Produce the JSON output.`;

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

function buildSystemPrompt(): string {
  return [
    ANALYSIS_ROLE_SECTION,
    ASR_GUARD_PROMPT.trim(),
    TONE_CALIBRATION_RULES.trim(),
    JSON_OUTPUT_SCHEMA,
    'CRITICAL: Respond with ONLY valid JSON. No markdown, no code fences, no explanations.',
  ].join('\n\n');
}

function buildUserPrompt(
  transcript: string,
  focusMetricKey?: string | null,
  pronunciationSummary?: PronunciationSummary | null,
): string {
  const sections = [
    COT_INSTRUCTIONS,
    COHERENCE_PROMPT_SECTION.trim(),
    VOCABULARY_DIVERSITY_PROMPT_SECTION.trim(),
    L1_INTERFERENCE_PROMPT_SECTION.trim(),
    PATTERN_ANALYSIS_SECTION,
  ];

  if (focusMetricKey != null && isSpeakingMetricKey(focusMetricKey)) {
    sections.push(buildFocusInstruction(focusMetricKey).trim());
  }

  if (pronunciationSummary != null) {
    sections.push(buildPronunciationContext(pronunciationSummary));
  }

  sections.push(`Transcript:\n${transcript}`);

  return sections.join('\n\n');
}

// Analyze transcript using Claude Haiku — returns structured insights validated against Prisma schema
export async function analyzeTranscript(
  transcript: string,
  focusMetricKey?: string | null,
  pronunciationSummary?: PronunciationSummary | null,
): Promise<AnalysisResult> {
  const { hashTranscript, getCachedAnalysis, setCachedAnalysis } = await import(
    '@/lib/ai/analysisCache'
  );

  const transcriptHash = hashTranscript(transcript);

  const cached = await getCachedAnalysis(transcriptHash);
  if (cached !== null) {
    return cached;
  }

  const client = getAnthropicClient();
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(transcript, focusMetricKey, pronunciationSummary);

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 3072,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userPrompt,
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

  const result: AnalysisResult = {
    ...validated,
    insights: applyInsightGuardrails(validated.insights),
  };

  void setCachedAnalysis(transcriptHash, result);

  return result;
}
