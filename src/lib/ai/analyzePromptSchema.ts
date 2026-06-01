// JSON output schema and chain-of-thought instruction constants for the Claude analysis pipeline

export const JSON_OUTPUT_SCHEMA = `Schema:
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
      "key": "connectorRepetition" | "structuralVariety" | "vocabularyPrecision" | "verbAccuracy" | "argumentClosure" | "fillerUsage" | "lexicalSophistication" | "registerPragmatics",
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
  ],
  "vocabularySuggestions": [
    {
      "word": "string",
      "meaning": "string",
      "exampleSentence": "string",
      "type": "word" | "collocation" | "phrase",
      "domain": "general" | "business" | "tech" | "academic" | "medical" | "legal",
      "frequencyBand": "high" | "mid" | "low" | "rare"
    }
  ],
  "collocations": [
    {
      "detected": "string",
      "nativeAlternative": "string",
      "explanation": "string"
    }
  ],
  "registerFeedback": {
    "register": "formal" | "neutral" | "informal",
    "appropriateness": "appropriate" | "slightly-off" | "mismatch",
    "hedgingLevel": "adequate" | "under-hedged" | "over-hedged",
    "directnessLevel": "appropriately-direct" | "too-direct" | "too-indirect",
    "suggestions": [
      { "original": "string", "issue": "string", "alternative": "string" }
    ],
    "note": "string"
  }
}`;

export const COT_INSTRUCTIONS = `Think step by step before producing JSON. Do NOT include your thinking in the output — only produce the final JSON object.

Step 1: Read the transcript and identify the speaker's main topic and intent.
Step 2: Count discourse markers, identify topic shifts, assess coherence flow.
Step 3: Count word frequencies, identify overused content words, estimate TTR.
Step 4: Scan for Spanish interference patterns (calques, false cognates, syntax).
Step 5: Identify recurring grammar, vocabulary, and structure patterns.
Step 6: Evaluate register appropriateness, hedging, and pragmatic competence.
Step 7: Score all 8 metrics based on your observations above.
Step 8: Write focusNext, summary, and intentLabel.
Step 9: Produce the JSON output.`;
