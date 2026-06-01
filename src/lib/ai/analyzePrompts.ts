// Builder functions for Claude analysis prompts; imports static section constants from analyzePromptSections
import { isSpeakingMetricKey } from '@/lib/metric-keys';
import type { PronunciationSummary } from './analyze';
import {
  ANALYSIS_ROLE_SECTION,
  ASR_GUARD_PROMPT,
  COT_INSTRUCTIONS,
  COHERENCE_PROMPT_SECTION,
  COLLOCATION_PROMPT_SECTION,
  JSON_OUTPUT_SCHEMA,
  L1_INTERFERENCE_PROMPT_SECTION,
  LEXICAL_SOPHISTICATION_PROMPT_SECTION,
  PATTERN_ANALYSIS_SECTION,
  REGISTER_PRAGMATICS_PROMPT_SECTION,
  TONE_CALIBRATION_RULES,
  VOCABULARY_DIVERSITY_PROMPT_SECTION,
  VOCABULARY_SUGGESTIONS_PROMPT_SECTION,
} from './analyzePromptSections';

export {
  ANALYSIS_ROLE_SECTION,
  ASR_GUARD_PROMPT,
  COT_INSTRUCTIONS,
  COHERENCE_PROMPT_SECTION,
  COLLOCATION_PROMPT_SECTION,
  JSON_OUTPUT_SCHEMA,
  L1_INTERFERENCE_PROMPT_SECTION,
  LEXICAL_SOPHISTICATION_PROMPT_SECTION,
  PATTERN_ANALYSIS_SECTION,
  REGISTER_PRAGMATICS_PROMPT_SECTION,
  TONE_CALIBRATION_RULES,
  VOCABULARY_DIVERSITY_PROMPT_SECTION,
  VOCABULARY_SUGGESTIONS_PROMPT_SECTION,
} from './analyzePromptSections';

const METRIC_LABELS: Record<string, string> = {
  connectorRepetition: 'Connector Repetition',
  structuralVariety: 'Structural Variety',
  vocabularyPrecision: 'Vocabulary Precision',
  verbAccuracy: 'Verb Accuracy',
  argumentClosure: 'Argument Closure',
  fillerUsage: 'Filler Usage',
  lexicalSophistication: 'Lexical Sophistication',
  registerPragmatics: 'Register & Pragmatics',
};

function buildFocusInstruction(focusMetricKey: string): string {
  const label = METRIC_LABELS[focusMetricKey] ?? focusMetricKey;
  return `FOCUS PRIORITY: The user is specifically training "${label}". Pay extra attention to this area in your analysis. In focusNext, reference progress on this specific metric and suggest concrete next steps for improvement.\n\n`;
}

/**
 * Renders the pronunciation context block injected into the Claude user prompt.
 *
 * Formats Azure accuracy/prosody scores and weak-phoneme lists as a labelled
 * section that instructs Claude not to re-score these values.
 *
 * @param summary - Aggregated Azure pronunciation data for the session.
 * @returns A formatted multi-line string ready for inclusion in the user prompt.
 */
export function buildPronunciationContext(summary: PronunciationSummary): string {
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

/**
 * Builds the Claude system prompt by joining the role declaration, ASR guard rules,
 * tone calibration rules, and the JSON output schema.
 *
 * @returns The complete system prompt string passed to every `analyzeTranscript` call.
 */
export function buildSystemPrompt(): string {
  return [
    ANALYSIS_ROLE_SECTION,
    ASR_GUARD_PROMPT.trim(),
    TONE_CALIBRATION_RULES.trim(),
    JSON_OUTPUT_SCHEMA,
    'CRITICAL: Respond with ONLY valid JSON. No markdown, no code fences, no explanations.',
  ].join('\n\n');
}

/**
 * Assembles the Claude user prompt by composing all analysis sections in order.
 *
 * Sections included: prompt context (if provided), chain-of-thought instructions,
 * coherence, vocabulary diversity, vocabulary suggestions, collocation, register,
 * lexical sophistication, L1 interference, pattern analysis, optional focus
 * instruction, optional pronunciation context, and finally the transcript.
 *
 * @param transcript - The Whisper-produced transcript to analyze.
 * @param focusMetricKey - If set and a valid `SpeakingMetricKey`, appends a focus instruction for that metric.
 * @param pronunciationSummary - If provided, appends the Azure pronunciation context block.
 * @param promptUsed - If provided, prepends the speaking-prompt topic for context.
 * @returns The fully assembled user-turn string.
 */
export function buildUserPrompt(
  transcript: string,
  focusMetricKey?: string | null,
  pronunciationSummary?: PronunciationSummary | null,
  promptUsed?: string | null,
): string {
  const sections: string[] = [];

  if (promptUsed != null && promptUsed.trim().length > 0) {
    sections.push(
      `PROMPT CONTEXT\nThe user was asked to speak about the following topic:\n"${promptUsed.trim()}"\nUse this context to make your feedback more specific. Reference the prompt where relevant.`,
    );
  }

  sections.push(
    COT_INSTRUCTIONS,
    COHERENCE_PROMPT_SECTION.trim(),
    VOCABULARY_DIVERSITY_PROMPT_SECTION.trim(),
    VOCABULARY_SUGGESTIONS_PROMPT_SECTION.trim(),
    COLLOCATION_PROMPT_SECTION.trim(),
    REGISTER_PRAGMATICS_PROMPT_SECTION.trim(),
    LEXICAL_SOPHISTICATION_PROMPT_SECTION.trim(),
    L1_INTERFERENCE_PROMPT_SECTION.trim(),
    PATTERN_ANALYSIS_SECTION,
  );

  if (focusMetricKey != null && isSpeakingMetricKey(focusMetricKey)) {
    sections.push(buildFocusInstruction(focusMetricKey).trim());
  }

  if (pronunciationSummary != null) {
    sections.push(buildPronunciationContext(pronunciationSummary));
  }

  sections.push(`Transcript:\n${transcript}`);

  return sections.join('\n\n');
}
