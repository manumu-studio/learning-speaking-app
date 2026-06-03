// Builds the system and user prompts for grammar flag classification via Claude
import type { DivergenceSpan } from '@/lib/analysis/divergence';

interface GrammarPromptOptions {
  readonly normalizedTranscript: string;
  readonly verbatimTranscript: string;
  readonly divergenceSpans: readonly DivergenceSpan[];
  readonly corpusEvidence: string | null;
}

export function buildGrammarSystemPrompt(): string {
  return `You are a grammar error classifier for English L2 learners at B2–C1 level.

You receive two transcripts of the same speech:
- A **normalized** transcript (Whisper ASR) — cleaned, grammar-corrected
- A **verbatim** transcript (AssemblyAI) — preserving disfluencies, false starts, and errors

Plus a list of **divergence spans** where the two transcripts disagree.

CLASSIFY each divergence span into exactly one category:

1. **grammar_error** — genuine grammar mistake (wrong tense, missing/wrong article, wrong preposition, subject-verb disagreement, word order). The normalized transcript "fixed" it.
   Set errorType to one of: verb_tense, article, preposition, agreement, word_order, other.

2. **self_correction** — the speaker started saying one thing and corrected themselves mid-sentence. Natural speech behavior, NOT an error.

3. **pronunciation_artifact** — ASR misheard due to accent or pronunciation. Neither version is a grammar error.

4. **false_start** — speaker abandoned a clause and restarted. NOT an error.

CONFIDENCE (0–1 scale):
- 0.9+ = very confident in classification
- 0.5–0.8 = moderate confidence
- Below 0.5 = uncertain
- If a span has low word confidence (< 0.6), bias toward pronunciation_artifact
- If corpus evidence confirms the normalized form is standard, increase confidence

CORPUS EVIDENCE:
If provided, use it to confirm or reject flagged constructions. Include the relevant evidence string in corpusEvidence when it influenced your classification.

Set errorType to null when classification is NOT grammar_error.
Set corpusEvidence to null when no corpus data was relevant.

OUTPUT FORMAT — JSON only, no commentary:
{ "flags": [{ "spanIndex": 0, "verbatimText": "...", "normalizedText": "...", "classification": "...", "errorType": "..." | null, "confidence": 0.0-1.0, "explanation": "...", "suggestion": "...", "corpusEvidence": "..." | null }] }

One flag per divergence span, in the same order as the input spans.`;
}

export function buildGrammarUserPrompt(options: GrammarPromptOptions): string {
  const { normalizedTranscript, verbatimTranscript, divergenceSpans, corpusEvidence } = options;

  const spansBlock = divergenceSpans
    .map((span, i) =>
      `[${i}] type=${span.type} confidence=${span.confidence.toFixed(2)} verbatim="${span.verbatimText}" normalized="${span.normalizedText}"`,
    )
    .join('\n');

  const sections = [
    'NORMALIZED TRANSCRIPT:',
    normalizedTranscript,
    '',
    'VERBATIM TRANSCRIPT:',
    verbatimTranscript,
    '',
    'DIVERGENCE SPANS:',
    spansBlock || '(none)',
    '',
    'CORPUS EVIDENCE:',
    corpusEvidence ?? 'No corpus evidence available.',
    '',
    'Classify each divergence span. Return JSON only, no commentary.',
  ];

  return sections.join('\n');
}
