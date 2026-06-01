// Static prompt-section string constants for the Claude analysis pipeline; JSON schema and CoT instructions live in analyzePromptSchema.ts
export { JSON_OUTPUT_SCHEMA, COT_INSTRUCTIONS } from './analyzePromptSchema';

export const ASR_GUARD_PROMPT = `The transcript below was produced by OpenAI Whisper, which has well-documented failure modes:
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

export const COHERENCE_PROMPT_SECTION = `
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

export const VOCABULARY_DIVERSITY_PROMPT_SECTION = `
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

export const VOCABULARY_SUGGESTIONS_PROMPT_SECTION = `
VOCABULARY SUGGESTIONS:
Suggest 2-3 specific words or phrases the speaker could add to their active vocabulary to improve precision and naturalness in this session's context.

Each suggestion must include:
- word: the target word or phrase
- meaning: a brief definition in plain English (one sentence)
- exampleSentence: a natural example sentence using the word in a context similar to the session topic
- type: "word" (single word), "collocation" (2-3 word combination), or "phrase" (formulaic sequence, 4+ words)
- domain: "general", "business", "tech", "academic", "medical", or "legal" — based on which register the word is most associated with. If unsure, use "general".
- frequencyBand: "high" (top 3000 words), "mid" (3001-8000), "low" (8001-15000), or "rare" (15000+). If unsure, use "mid".

Produce a vocabularySuggestions array with exactly 2-3 items. Choose words that are genuinely useful upgrades — not obscure synonyms. Do not repeat words already flagged in vocabulary insights.
`;

export const COLLOCATION_PROMPT_SECTION = `
COLLOCATION AND FORMULAIC SEQUENCE DETECTION:
Identify 1-3 instances where the speaker used a grammatically correct but non-native-sounding word combination (weak collocation). For each:
- detected: the exact phrase from the transcript
- nativeAlternative: the higher-MI (mutual information) native-sounding alternative
- explanation: why the alternative sounds more natural to native ears

Only flag collocations you are confident about — do not invent them. Return an empty array if none are detected.

Produce a collocations array (max 3 items).
`;

export const REGISTER_PRAGMATICS_PROMPT_SECTION = `
REGISTER & PRAGMATICS ANALYSIS:
Analyze the speaker's register choices and pragmatic competence. This is critical for C1→C2 progression — learners at this level are often grammatically correct but pragmatically off.

Evaluate:
1. REGISTER: Is the speech formal, neutral, or informal? Is this appropriate for the topic/context?
2. HEDGING: Does the speaker use hedging language appropriately? Over-direct speech sounds rude in professional/academic English. Look for:
   - Missing hedges: "You need to..." → "You might want to..." / "It could be worth..."
   - Missing softeners: "That's wrong" → "That doesn't quite work" / "I'm not sure that's ideal"
   - Missing modal verbs for politeness: "Do this" → "Could you do this?" / "Would you mind..."
3. POLITENESS STRATEGIES: Appropriate directness level? Face-saving language present?
4. PRAGMATIC COMPETENCE: Does the speaker signal topic shifts? Use appropriate discourse functions (agreeing, disagreeing, clarifying, summarizing)?

Score registerPragmatics (1-10):
- 1-3: Frequent register mismatches, no hedging, sounds blunt or inappropriately casual/formal
- 4-6: Generally appropriate register, some hedging present, occasional directness issues
- 7-10: Register well-matched, hedging natural and varied, discourse functions used smoothly

Produce a registerFeedback object:
{
  "register": "formal" | "neutral" | "informal",
  "appropriateness": "appropriate" | "slightly-off" | "mismatch",
  "hedgingLevel": "adequate" | "under-hedged" | "over-hedged",
  "directnessLevel": "appropriately-direct" | "too-direct" | "too-indirect",
  "suggestions": [
    {
      "original": "<exact phrase from transcript>",
      "issue": "<one sentence explaining the pragmatic issue>",
      "alternative": "<diplomatic/appropriate rewording>"
    }
  ],
  "note": "<1-2 sentence coaching summary>"
}

Rules:
- Maximum 5 suggestions. Prioritize the most impactful rewording opportunities.
- If register is fully appropriate and hedging is adequate, still provide 1-2 upgrade suggestions for C2-level polish.
- Frame all feedback as leveling up, not correcting mistakes.
`;

export const LEXICAL_SOPHISTICATION_PROMPT_SECTION = `
LEXICAL SOPHISTICATION SCORING:
Score the speaker's lexical sophistication on a 1-10 scale. This measures the ratio of mid-frequency, low-frequency, and rare vocabulary to total unique content words.

Rubric:
- 1-3: Almost entirely high-frequency basic vocabulary ("good", "big", "important", "make", "get")
- 4-6: Mix of high and mid-frequency words, occasional precise vocabulary ("establish", "demonstrate", "perspective")
- 7-8: Consistent use of mid-to-low frequency words, academic/professional vocabulary ("notwithstanding", "mitigate", "contingent")
- 9-10: Native-like lexical sophistication with rare and domain-specific vocabulary used naturally

Include this as a metric with key "lexicalSophistication" in your metrics array.
For transcripts under 20 words, skip this metric entirely.
`;

export const L1_INTERFERENCE_PROMPT_SECTION = `
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

export const TONE_CALIBRATION_RULES = `
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

export const ANALYSIS_ROLE_SECTION = `You are an English language pattern analyzer for B2-C1+ English learners practicing speaking.`;

export const PATTERN_ANALYSIS_SECTION = `Your task: Analyze this transcript and identify the TOP 3-5 RECURRING patterns (not isolated mistakes). Focus on habits that appear multiple times across the session.

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

Score ONLY these 8 metrics on a 1-10 scale (10 = native-like proficiency):
connectorRepetition, structuralVariety, vocabularyPrecision, verbAccuracy, argumentClosure, fillerUsage, lexicalSophistication, registerPragmatics.
For each metric provide: key, level (low=1-3, medium=4-6, high=7-10), score (1-10), note (one sentence observation).
Do NOT score pronunciationAccuracy, prosodyScore, or speakingRate — those are computed separately from Azure data.`;
