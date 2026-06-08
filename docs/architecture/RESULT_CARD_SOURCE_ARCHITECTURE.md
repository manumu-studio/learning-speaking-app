# Result Card Source Architecture Report

**Date:** 2026-06-08  
**Scope:** Session result card, History day card, Day Detail card, and Logs/Evidence register  
**Purpose:** Explain how every visible category and subcategory is built, which data source or technology supports it, and where the current implementation still needs correction.

## Executive Summary

The result experience is built from two different levels of evidence:

1. **Session result card** - one completed recording. It shows the transcript, session metrics, speech-quality coaching, pronunciation and intonation feedback, and evidence links.
2. **Day card / Day Detail** - a meta-session built from all completed sessions on a closed day. It summarizes the day, lists sessions, aggregates Speech Quality, aggregates Pronunciation & Intonation, builds General Feedback, and links to source evidence.

The most important architectural correction is the source routing:

| Channel | Role | Best for | Should not be used for |
|---|---|---|---|
| Whisper clean transcript | Clean/intended user message | Vocabulary, structure, argument flow, topic development, improved transcript | Filler count, false starts, self-corrections, exact grammar slips |
| AssemblyAI verbatim transcript | Truth/verbatim speech | Fillers, repetitions, false starts, divergence spans, grammar candidates | Clean written-style vocabulary scoring by itself |
| Azure Speech Pronunciation Assessment | Word-level pronunciation and prosody scoring | Pronunciation accuracy, phonemes, word timing, prosody, speaking rate | Grammar, vocabulary, register |
| Praat contour service | Pitch and intensity visualization | Pitch contour, voiced/unvoiced frames, intonation visualization | Language scoring |
| Corpus tables | External linguistic evidence | Lexical frequency, collocation strength, attestation, naturalness grounding | Full coaching narrative by itself |
| Language-model analysis service | Structured coaching interpretation | Insights, summaries, register judgments, vocabulary suggestions, narrative shaping | Raw timing, raw pronunciation scoring, source-of-truth transcript facts |
| Deterministic builders | Aggregation and display logic | Day averages, active targets, word-bank grouping, evidence tables | Creating new evidence |

The current branch already has the visible Day Detail hierarchy and most read-model plumbing, but several outputs are not yet aligned with the desired behavior:

- Suggestion Words currently render item explanations; the desired UI is clean grouped lists: 4 collocations, 4 connectors, 4 adjectives/adverbs, 4 verbs.
- Some scoring still happens against the clean transcript before the AssemblyAI truth channel has corrected the metric.
- Grammar flags and divergence spans exist, but some recent AssemblyAI-backed sessions had divergence spans without persisted grammar flags.
- Register & Pragmatics exists in the database and analysis schema, but it is not consistently persisted or parsed across every pipeline/UI path.
- Naturalness is not wired equally across all processing paths.
- Word Bank display exists, but the current Day Detail read model can merge computed suggestions before existing bank metadata, which can hide mastery/active state for duplicate items.

## Core Data Model

The result cards are not built directly from one response. They are composed from persisted database rows through Prisma and validated client schemas.

### Main Tables

| Table/model | Purpose | Used by |
|---|---|---|
| `SpeakingSession` | Session state, topic, prompt, summary, register feedback, verbatim fields, grammar flags | Session card, Day Detail, Evidence |
| `Transcript` | Clean transcript, improved transcript, word count, vocabulary used in rewrite | Transcript views, Day word totals |
| `Insight` | Recurring language patterns: grammar, vocabulary, structure | Speech Quality sections |
| `MetricSnapshot` | Numeric metric scores, one row per session and metric key | Pillars, hero scores, category averages |
| `PronunciationReport` | Azure overall pronunciation scores and speaking rate | Pronunciation score summary |
| `WordPronunciation` | Azure word-level pronunciation, offsets, duration, phonemes, prosody tags | Transcript map, phoneme details, priority sounds |
| `NaturalnessFlag` | Naturalness/collocation/style issues shown to the user | Naturalness section, evidence register |
| `LanguageBankItem` | Tracked vocabulary/pattern bank with usage and mastery | Word Bank, active targets, practice planning |
| `DailyConclusion` | Cached closed-day conclusion, scores, topic sentence, active targets | History day card, Day Detail hero |
| `ChunkResult` / `SessionChunk` | Intermediate chunk outputs | Segment view, fan-in aggregation |
| `ChunkFeature` | Pitch/intensity contour frames | Pitch contour visualization |

### Metric Pillars

The canonical grouping comes from `src/features/dashboard/pillars.ts`.

| Pillar | Metric keys | Main source |
|---|---|---|
| Delivery | `speakingRate`, `fillerUsage` | Azure timing for speaking rate; AssemblyAI should drive filler usage |
| Language | `connectorRepetition`, `structuralVariety`, `vocabularyPrecision`, `verbAccuracy`, `lexicalSophistication`, `registerPragmatics`, `argumentClosure` | Mostly clean transcript plus corpus, with grammar and repetition routed through AssemblyAI |
| Pronunciation | `pronunciationAccuracy`, `prosodyScore` | Azure Speech Pronunciation Assessment |

## Processing Pipeline

### Single-Recording Pipeline

The non-chunked pipeline in `src/lib/pipeline/executePipeline.ts` runs these stages:

1. Download audio from object storage.
2. Start AssemblyAI verbatim transcription in parallel.
3. Transcode audio to PCM WAV for Azure.
4. Transcribe with Whisper.
5. Apply confidence gating to produce a clean user transcript and an annotated analysis transcript.
6. Store the clean transcript in `Transcript`.
7. Run Azure pronunciation assessment using the clean transcript as reference text.
8. Persist `PronunciationReport`, `WordPronunciation`, and pronunciation-derived metric snapshots.
9. Build corpus evidence.
10. Run the language-model analysis service.
11. Store insights, metrics, summary, focus-next, intent label, and register feedback.
12. Finish AssemblyAI verbatim transcription.
13. Compute divergence spans between clean transcript and verbatim transcript.
14. Classify divergence spans into grammar/self-correction/pronunciation-artifact/false-start flags.
15. Override `verbAccuracy` from grammar evidence.

This path is closest to the intended routing because it starts verbatim early and later runs grammar correction from divergence spans.

### Independent Chunk Pipeline

The independent chunk pipeline in `src/lib/pipeline/processChunkIndependent.ts` and `src/lib/pipeline/processParallelFinal.ts` works differently:

1. Each chunk runs Whisper, Azure, AssemblyAI, and per-chunk language analysis.
2. Chunk outputs are stored in `ChunkResult`.
3. The fan-in worker stitches the clean transcript.
4. Pronunciation is merged and persisted.
5. Per-chunk insights are synthesized into session-level insights and metrics.
6. Verbatim chunk text is stitched and divergence spans are persisted.
7. Grammar analysis runs after synthesis and can override `verbAccuracy`.

This path is efficient, but it has a key source-routing risk: several language and delivery metrics are synthesized before the final AssemblyAI divergence pass. That means filler usage, false starts, repetitions, and some grammar-sensitive scoring can still be based on clean transcript evidence unless the corrected routing explicitly passes verbatim evidence into the synthesis stage or applies deterministic overrides afterward.

### Day Detail Builder

The Day Detail read model is built by `src/lib/daily/dayDetail/buildDayDetailData.ts`.

It fetches all `DONE` sessions for a UTC day, plus:

- transcripts
- insights
- metric snapshots
- register feedback
- grammar flags
- verbatim word count
- naturalness flags
- pronunciation reports and word rows
- existing language bank items
- cached daily conclusion

Then it builds:

- `hero` through `buildHero`
- `sessions` through `buildDaySessions`
- `speechQuality` through `buildDaySpeechQuality`
- `pronunciation` through `buildDayPronunciation`
- `generalFeedback` through `buildDayGeneralFeedback`
- `transcript` through `buildDayTranscript`

This separation is healthy: the UI mostly renders a deterministic read model instead of recomputing evidence in React.

## Session Result Card

The session result page is assembled by:

- `src/app/(app)/session/[id]/SessionDoneView.tsx`
- `src/app/(app)/session/[id]/SessionFeedbackSections.tsx`
- `src/features/session/useSessionStatus.ts`
- `src/app/api/sessions/[id]/route.ts`

### Session Hero

**What the user sees**

- Session summary
- Date/time
- Duration
- Word count
- Insight count
- Workout/session number
- Partial-results badge when chunk failures produced incomplete results

**How it is built**

- API route fetches `SpeakingSession`, `Transcript`, `Insight`, `MetricSnapshot`, `PronunciationReport`, `ChunkResult`, and `NaturalnessFlag`.
- `useSessionStatus` validates the response with Zod and normalizes it into `SessionDetail`.
- `SessionDoneView` passes summary, duration, word count, and insight count into `SessionHeader`.

**Technologies**

- Next.js App Router API route
- Prisma
- Zod
- React client component

**Evidence**

- `SpeakingSession.summary`
- `SpeakingSession.createdAt`
- `SpeakingSession.durationSecs`
- `Transcript.wordCount`
- `Insight[]`
- completed-session count for `workoutNumber`

**Known gaps**

- If the client schema omits a returned scalar, Zod strips it. This currently matters for `registerFeedback`, which the UI type expects but `useSessionStatus` does not parse.

### Session Pillar Row

**What the user sees**

- Delivery, Language, and Pronunciation pillar scores.

**How it is built**

- `PillarHeroRow` receives `MetricSnapshot[]`.
- Metrics are grouped by `PILLAR_CONFIG`.
- Each pillar average is computed from its constituent metric keys.

**Technologies**

- Metric snapshots in Postgres
- Deterministic React aggregation

**Source quality**

- Pronunciation pillar is strong because it comes from Azure-derived metrics.
- Delivery is mixed: speaking rate is strong because it comes from timings, but filler usage must be routed to AssemblyAI.
- Language is mixed: vocabulary/structure can use clean transcript evidence, but grammar and repetitions need AssemblyAI.

## Session Speech Quality

The session Speech Quality section renders:

1. Grammar
2. Vocabulary
3. Structure
4. Register & Pragmatics
5. Naturalness

### Session Grammar

**What the user sees**

- Recurring grammar insight cards.
- If available, a separate grammar section built from classified divergence spans.

**Current files**

- `SessionFeedbackSections.tsx`
- `CategoryInsightsSection.tsx`
- `GrammarSection/GrammarSection.tsx`
- `runGrammarAnalysis.ts`
- `classifyDivergenceSpans.ts`
- `scoreVerbAccuracy.ts`

**How it is built**

There are two grammar layers:

1. **Pattern insights** from `Insight` rows where `category = "grammar"`.
2. **Grammar flags** from AssemblyAI divergence spans, stored in `SpeakingSession.grammarFlags`.

The corrected source flow should be:

1. Whisper produces the clean transcript.
2. AssemblyAI produces the verbatim transcript.
3. `detectDivergence` compares clean and verbatim text.
4. Divergence spans become candidate evidence.
5. The grammar classifier labels each span as:
   - `grammar_error`
   - `self_correction`
   - `pronunciation_artifact`
   - `false_start`
6. `scoreVerbAccuracy` computes a score from classified grammar errors and total divergence span count.
7. The `verbAccuracy` metric snapshot is overridden with this evidence-based score.

**Technologies**

- AssemblyAI Universal-3-Pro for verbatim transcript
- OpenAI Whisper for clean transcript
- Alignment/diff logic in `src/lib/analysis/divergence`
- Language-model classifier for divergence labels
- Corpus evidence for grounding some grammar decisions
- Prisma JSON fields
- Zod schema validation

**Why AssemblyAI matters**

Whisper often cleans speech into a readable transcript. That is good for understanding intent, but bad for grammar truth. If the user says "I was go" and Whisper normalizes it into "I was going," grammar scoring must not reward the cleaned version. AssemblyAI is the truth channel for the raw spoken form.

**Current gaps**

- Some recent sessions had many divergence spans but zero grammar flags. That means the truth channel was stored, but classification did not produce or persist usable grammar evidence.
- `verbAccuracy` can still be produced first by general transcript analysis and only corrected later if grammar analysis succeeds.
- Grammar insights from the clean transcript should be secondary to `grammarFlags` for score-sensitive claims.

### Session Vocabulary

**What the user sees**

- Vocabulary insight cards.
- Suggested vocabulary upgrades may later feed improved transcript and word-bank behavior.

**Current files**

- `CategoryInsightsSection.tsx`
- `analyzePrompts.ts`
- `analyzePromptSections.ts`
- `persistVocabSuggestions.ts`
- `rewriteTranscript.ts`
- `buildCorpusEvidence.ts`

**How it is built**

Vocabulary currently comes from clean transcript analysis:

1. Whisper transcript is cleaned and stored.
2. Corpus evidence is built from content words, collocations, and phrase candidates.
3. The language-model analysis service scores:
   - `vocabularyPrecision`
   - `lexicalSophistication`
4. It returns vocabulary insights and optional vocabulary suggestions.
5. Suggestions can be persisted as `VocabSuggestion`.
6. `rewriteTranscript` may generate an improved transcript using selected vocabulary.

**Technologies**

- OpenAI Whisper clean transcript
- Corpus tables: `Lexeme`, collocation data, expression attestation
- Language-model analysis service
- Prisma
- Zod

**Correct routing**

Vocabulary should mostly use Whisper because the user’s intended message matters more than raw hesitation. If AssemblyAI includes many fillers, repeated starts, and repairs, lexical sophistication may be unfairly depressed. However, repeated generic phrasing captured by AssemblyAI can still be useful as supporting evidence.

**Current gaps**

- Some vocabulary insights can become diagnostic labels instead of practice items if not carefully filtered. The day suggestion-word builder now avoids using `insight.pattern` as the suggestion text, but the UI still needs to keep suggestion lists clean.

### Session Structure

**What the user sees**

- Structure insight cards.
- Feedback on connectors, argument closure, structural variety, and topic flow.

**Current files**

- `CategoryInsightsSection.tsx`
- `analyzePromptSections.ts`
- `synthesize.ts`
- `buildDaySpeechQuality.ts`

**How it is built**

Structure is scored through:

- `structuralVariety`
- `argumentClosure`
- `connectorRepetition`

The analysis prompt asks for coherence, topic development, logical flow, discourse markers used, and discourse markers recommended. The output is persisted as metric snapshots and structure insights.

**Technologies**

- Clean transcript
- Prompt context from `SpeakingSession.promptUsed`
- Language-model analysis service
- Metric snapshots

**Correct routing**

Structure is mostly a clean-transcript category because the question is: did the intended argument develop? However, connector repetition should use AssemblyAI as supporting evidence when the repeated connector is actually spoken repeatedly, especially for "so", "and", "because", and false-start repairs.

**Current gaps**

- In the chunk fan-in path, `synthesizeAnalysis` scores connector repetition from the stitched clean transcript and per-chunk insights. It does not currently receive verbatim evidence.

### Session Register & Pragmatics

**What the user sees**

- Register classification.
- Appropriateness badge.
- Hedging/directness indicators.
- Suggested rephrasings.

**Current files**

- `RegisterFeedback.tsx`
- `analyzePromptSections.ts`
- `executePipelineHelpers.ts`
- `buildDaySpeechQuality.ts`

**How it is intended to be built**

The analysis schema can return `registerFeedback`:

- `register`: formal, neutral, informal
- `appropriateness`
- `hedgingLevel`
- `directnessLevel`
- `suggestions`
- `note`

The non-chunked pipeline stores this in `SpeakingSession.registerFeedback`. The day builder checks whether any session has `registerFeedback` and creates a Register & Pragmatics category.

**Technologies**

- Clean transcript
- Prompt/topic context
- Verbatim transcript for spoken hedging and softeners
- Language-model analysis service
- Prisma JSON
- React badges/cards

**Correct routing**

Register & Pragmatics should be hybrid:

- Use Whisper for semantic intent, topic, and the cleaned proposition.
- Use AssemblyAI for hedges, softeners, fillers, self-repairs, and spoken directness.
- Use prompt/topic context to decide whether the register fits the task.

**Current gaps**

- The client `SessionDetail` type supports `registerFeedback`, and the session API returns session scalar fields, but `useSessionStatus.ts` does not currently parse `registerFeedback`, so the session UI can lose it after Zod validation.
- The chunk fan-in synthesis result does not include `registerFeedback`, so register output is not consistently produced across pipeline variants.
- The day category currently has metrics, but its item list is thin because `Insight.category` only supports grammar, vocabulary, and structure.

### Session Naturalness

**What the user sees**

- Naturalness flags grouped by confidence tier:
  - L1 transfer patterns
  - Collocation suggestions
  - Style notes
- Original phrase, suggested phrase, rationale, and user feedback controls.

**Current files**

- `NaturalnessInsights.tsx`
- `NaturalnessFlagCard.tsx`
- `detectCalques.ts`
- `confidenceGate.ts`
- `persistNaturalness.ts`
- `buildDaySpeechQuality.ts`

**How it is built**

Naturalness can come from:

1. Deterministic Spanish L1 calque detection.
2. Language-model naturalness observations.
3. Corpus evidence for collocation/frequency grounding.
4. Confidence gating and merging.
5. Persisted `NaturalnessFlag` rows.

**Technologies**

- AssemblyAI should supply verbatim phrasing for truth.
- Clean transcript helps avoid noisy filler fragments.
- Corpus tables ground collocation claims.
- Deterministic calque rules catch known Spanish-to-English transfer patterns.
- Prisma stores flags.

**Correct routing**

Naturalness should use AssemblyAI plus corpus evidence. This is because the C1-to-C2 naturalness gap often lives in exact phrasing, filler habits, hedge placement, and spoken rhythm. Whisper can over-clean these.

**Current gaps**

- Naturalness persistence is wired in some paths but not consistently across all processing paths.
- The chunk fan-in path synthesizes insights and metrics but does not currently persist naturalness flags from the final session-level analysis.

## Session Pronunciation & Intonation

The session Pronunciation & Intonation section renders:

1. Score Summary
2. Transcript Map / Improved Version
3. Phoneme Patterns
4. Priority Sounds
5. Rhythm & Intonation
6. Prosody Details
7. Pitch Contour
8. Practice Suggestion
9. Accent Polish
10. Pronunciation Progress

### Session Score Summary

**What the user sees**

- Pronunciation score.
- Accuracy.
- Fluency.
- Completeness.
- Prosody.
- Speaking rate.

**Current files**

- `PronunciationSection`
- `persistPronunciation.ts`
- `azurePronunciation.ts`

**How it is built**

Azure Speech Pronunciation Assessment returns:

- `pronScore`
- `accuracyScore`
- `fluencyScore`
- `completenessScore`
- `prosodyScore`
- word-level timing and phoneme data

`persistPronunciation.ts` stores raw Azure scores in `PronunciationReport` and maps selected scores to app-scale `MetricSnapshot` rows:

- `pronunciationAccuracy`
- `prosodyScore`
- `speakingRate`

**Technologies**

- Microsoft Azure Speech SDK
- PCM WAV audio
- Prisma transaction
- Azure-to-app non-linear score mapping

**Conclusion logic**

Pronunciation conclusions should come from Azure and word-level evidence, not from general language analysis.

### Session Transcript Map / Improved Version

**What the user sees**

- Clean transcript.
- Improved version when available.
- Word-level pronunciation coloring.
- Compare tab when verbatim transcript exists.
- Clickable words that open phoneme details.

**Current files**

- `TranscriptToggle`
- `TranscriptComparison`
- `DivergenceHighlighter`
- `PhonemeDetail`
- `DayTranscriptSections.tsx` for day-level version

**How it is built**

Session transcript modes combine:

- `Transcript.text` from Whisper clean transcript
- `Transcript.improvedText` from rewrite output
- `WordPronunciation[]` from Azure
- `SpeakingSession.verbatimTranscript` from AssemblyAI
- `SpeakingSession.divergenceSpans` from divergence detection

**Technologies**

- OpenAI Whisper
- AssemblyAI
- Azure Speech SDK
- React token rendering
- Zod response validation

**Correct routing**

The transcript map should show clean speech for readability, but the Compare tab should expose the truth channel when scoring needs justification.

### Session Phoneme Patterns

**What the user sees**

- Weak repeated phonemes with average accuracy, occurrence count, and example words.

**Current files**

- `PhonemePatterns`
- `aggregatePhonemes`
- `sapiToIpa`

**How it is built**

Azure returns phoneme-level accuracy inside each word. The app aggregates phoneme scores across all words, maps Azure SAPI phonemes to IPA, counts occurrences, and displays repeated weak sounds.

**Technologies**

- Azure phoneme data
- SAPI-to-IPA mapping
- Deterministic aggregation

**Conclusion logic**

This is evidence-based. A phoneme pattern should appear only if it recurs enough to matter.

### Session Priority Sounds

**What the user sees**

- Highest-impact pronunciation targets.

**Current files**

- `PrioritySounds`
- `rankByFunctionalLoad.ts`
- `functionalLoad.ts`

**How it is built**

The app combines:

- Azure phoneme accuracy
- occurrence counts
- functional-load weights
- Spanish L1 structural patterns

It ranks errors by functional-load score so the user practices sounds that affect intelligibility more.

**Technologies**

- Azure word/phoneme evidence
- Functional-load lookup table
- Spanish L1 pattern detection
- Deterministic ranking

**Conclusion logic**

Priority is not simply "lowest score." It is "lowest useful score multiplied by communication impact and frequency."

### Session Rhythm & Intonation

**What the user sees**

- Repeated rhythm or intonation issues such as unexpected breaks, missing breaks, or monotone markers.

**Current files**

- `ProsodyFeedback`
- `ProsodyPanel`
- `buildDayPronunciation.ts`

**How it is built**

Azure word rows include:

- `breakErrorTypes`
- `intonationErrorTypes`
- `monotonePitchDelta`

The UI counts recurring tags and explains them in plain language.

**Technologies**

- Azure prosody feedback
- Word-level timing
- Deterministic count aggregation

**Conclusion logic**

Rhythm/intonation should be based on repeated tagged moments, not a single word.

### Session Prosody Details

**What the user sees**

- Speaking rate.
- Prosody score.
- Break/intonation details.

**Current files**

- `ProsodyPanel`
- `persistPronunciation.ts`

**How it is built**

Speaking rate is computed from Azure word durations, excluding insertions and omissions. The app target range is 110-140 WPM for learner practice. Raw Azure prosody is mapped onto the app display scale separately.

**Technologies**

- Azure word timing
- Deterministic speaking-rate formula

**Conclusion logic**

Speaking rate should be a measurement, not an interpretation. Filler usage is separate and should be AssemblyAI-routed.

### Session Pitch Contour

**What the user sees**

- F0/pitch contour and intensity over time when available.

**Current files**

- `PitchContour`
- `src/app/api/sessions/[id]/pitch/route.ts`
- `src/lib/praat/client.ts`
- `src/lib/pitch/stitchContours`

**How it is built**

Audio is sent to a Praat/parselmouth microservice. It returns:

- frame length
- F0 Hz values
- intensity dB values
- voiced/unvoiced flags
- duration

Chunk features are stitched for the session.

**Technologies**

- Praat/parselmouth service
- Presigned audio URL
- `ChunkFeature` rows
- Zod response validation

**Conclusion logic**

Pitch contour is visual evidence. It supports intonation coaching but should not create language claims by itself.

### Session Practice Suggestion

**What the user sees**

- One focused pronunciation drill recommendation.

**Current files**

- `PracticeSuggestion`
- `rankByFunctionalLoad.ts`

**How it is built**

The practice suggestion should be derived from the highest-priority sound or recurring prosody issue. The current implementation uses the pronunciation report and prioritization helpers.

**Technologies**

- Azure word/phoneme data
- Functional-load ranking

**Conclusion logic**

The recommendation should be narrow: one sound or one rhythm behavior, not a generic "practice pronunciation."

### Session Accent Polish

**What the user sees**

- Lower-impact pronunciation refinements.

**Current files**

- `AccentPolish`
- `splitByPriority`

**How it is built**

`rankByFunctionalLoad` separates high/moderate functional-load targets from low functional-load polish targets. Accent Polish displays the lower-impact group.

**Technologies**

- Azure phoneme data
- Functional-load table

**Conclusion logic**

Accent Polish is not urgent intelligibility work. It is refinement after priority sounds are handled.

### Session Pronunciation Progress

**What the user sees**

- Recent pronunciation history and improvement signals.

**Current files**

- `PronunciationProgress`
- `/api/sessions/[id]/pronunciation-history`

**How it is built**

The current session is compared against prior pronunciation reports. The UI can show deltas such as fluency movement.

**Technologies**

- Prisma query over prior `PronunciationReport` rows
- React history visualization

**Conclusion logic**

Progress is historical. It should compare against previous sessions, not only describe today.

## History Day Card

The compact History day card is built by:

- `DailySummaryCard.tsx`
- `useDailySummaryCard.ts`
- `GET /api/daily/[date]`
- `generateDailyConclusion.ts`

### History Day Card Hero

**What the user sees**

- Date
- Topic sentence
- Total minutes
- Total words
- Session count
- Overall score
- Delivery, Language, Pronunciation scores
- Active targets for tomorrow

**How it is built**

1. `useDailySummaryCard` fetches `/api/daily/[date]`.
2. The API lazily generates a `DailyConclusion` if the day is closed and no cached conclusion exists.
3. `generateDailyConclusion` aggregates all completed sessions for that day.
4. `aggregateDayData` averages metrics by pillar.
5. `renderConclusionNarrative` creates a concise topic sentence and coaching note from structured day data.
6. The card displays the stored/cached result.

**Technologies**

- Next.js API route
- Prisma
- Metric aggregation
- Language-model narrative renderer
- Zod validation

**Known gaps**

- The compact card currently uses `activeTargetsTomorrow` from `DailyConclusion`, while Day Detail builds its own active targets from the 16 suggestion words. These should converge so the subtle card and the Day Detail card point to the same four targets.

## Day Detail Card

The Day Detail card is the main closed-day result. It is built by:

- `DayDetailContent.tsx`
- `useDayDetailContent.ts`
- `/api/daily/[date]`
- `buildDayDetailData.ts`

It renders:

1. Hero
2. Sessions
3. Speech Quality
4. Pronunciation & Intonation
5. General Feedback
6. Logs/Evidence link

### Day Hero

**What the user sees**

- Date
- Topic sentence
- Total duration
- Total words
- Session count
- Overall score
- Pillar scores
- Focus areas

**How it is built**

`buildHero` combines:

- `DailyConclusion` scores and topic sentence when available
- fallback aggregation from `aggregateDayData`
- total words from `Transcript.wordCount`, falling back to `verbatimWordCount`
- focus areas from lowest average metric keys

**Technologies**

- Prisma
- Deterministic day aggregation
- Cached daily conclusion

**Conclusion logic**

The hero should be a day-level snapshot, not a detailed diagnosis. It answers: what happened today, how much practice happened, and where attention should go.

### Day Sessions

**What the user sees**

- Each completed session from the day.
- Time label.
- Topic.
- Duration.
- A pronunciation metric highlight.
- A speech-quality metric highlight.
- Link to the individual session result page.

**Current files**

- `buildDaySessions.ts`
- `DayDetailContent.tsx`

**How it is built**

For each session:

- Topic comes from `intentLabel`, `topic`, or `promptUsed`.
- Pronunciation highlight chooses the weaker of fluency/prosody.
- Speech highlight chooses the weakest speech-quality metric among grammar, vocabulary, structure, connectors, register.
- Tone is based on score threshold.

**Technologies**

- Prisma session query
- Deterministic metric selection
- Next.js links

**Conclusion logic**

This section is navigation plus quick triage. It should not repeat the full session analysis.

## Day Speech Quality

Day Speech Quality is built by `buildDaySpeechQuality.ts`.

It contains:

1. Grammar
2. Vocabulary
3. Structure
4. Register & Pragmatics
5. Naturalness
6. Word Bank / repeated language patterns

### Day Grammar

**What the user sees**

- Average grammar score.
- Grammar flags when available.
- Grammar insights from sessions.

**How it is built**

Inputs:

- `MetricSnapshot` rows with `key = "verbAccuracy"`
- `SpeakingSession.grammarFlags`
- `Insight` rows where `category = "grammar"`

Builder behavior:

- Average `verbAccuracy`.
- Parse grammar flags with Zod.
- Keep flags classified as `grammar_error`.
- Add grammar insights after grammar flags.

**Technology/source routing**

- Correct source: AssemblyAI + divergence spans + grammar classifier.
- Supporting source: clean transcript insights for recurring patterns.
- Corpus evidence may support classification.

**Known gaps**

- If grammar flags are empty, the Day Grammar card falls back to clean transcript insights, which may be less truthful for spoken errors.

### Day Vocabulary

**What the user sees**

- Average vocabulary score.
- Vocabulary patterns from all sessions.

**How it is built**

Inputs:

- `vocabularyPrecision`
- `lexicalSophistication`
- vocabulary insights
- corpus evidence already used upstream

Builder behavior:

- Average vocabulary metrics.
- Show up to four vocabulary insight items.

**Technology/source routing**

- Correct source: mostly Whisper clean transcript plus corpus evidence.
- Supporting source: AssemblyAI only for repeated generic phrasing or spoken overuse.

**Known gaps**

- Vocabulary should not use diagnostic labels as practice words. The suggestion builder now avoids that, but the vocabulary category still renders insight labels as feedback titles, which is fine for diagnostics but not for Suggestion Words.

### Day Structure

**What the user sees**

- Average structure score.
- Structural insight items from all sessions.

**How it is built**

Inputs:

- `structuralVariety`
- `argumentClosure`
- `connectorRepetition`
- structure insights

Builder behavior:

- Average all structure metrics.
- Show structure insights.

**Technology/source routing**

- Correct source: mostly clean transcript for argument shape.
- AssemblyAI should support connector repetition, repeated restarts, and false-start structure issues.

**Known gaps**

- Connector repetition can be undercounted if Whisper cleaned repeated connectors.

### Day Register & Pragmatics

**What the user sees**

- Register & Pragmatics category if any session has register feedback.
- Average `registerPragmatics` score.

**How it is built**

Inputs:

- `registerPragmatics` metric
- `SpeakingSession.registerFeedback`

Builder behavior:

- Insert the category after Structure when register feedback exists.
- Average the register metric.

**Technology/source routing**

- Correct source: hybrid.
- Clean transcript for semantic intent and appropriateness.
- AssemblyAI for actual hedging, softeners, self-repairs, and spoken directness.
- Prompt/topic context for register fit.

**Known gaps**

- The day builder currently checks for `registerFeedback`, but the visible item list relies on `insightItems("register")`, while stored insights are only grammar/vocabulary/structure. This makes the category summary score-driven but light on concrete examples.

### Day Naturalness

**What the user sees**

- Naturalness items such as original phrase to suggested phrase.
- Evidence from collocation metric or rationale.

**How it is built**

Inputs:

- `NaturalnessFlag` rows where `shownToUser = true`

Builder behavior:

- Show up to six flags.
- High-confidence flags get a watch tone.
- Evidence uses corpus metric when available; otherwise rationale.

**Technology/source routing**

- Correct source: AssemblyAI + corpus evidence + deterministic L1 checks.
- Clean transcript can help remove noise, but verbatim phrasing should drive exact phrase diagnosis.

**Known gaps**

- Naturalness flags are not guaranteed across all pipeline variants.

### Day Word Bank / Repeated Language Patterns

**What the user sees**

- Tracked words and patterns grouped by category.
- Mastery state.
- Usage count.
- Active target ring.

**How it is built**

Inputs:

- `LanguageBankItem` rows
- computed suggestion words in Day General Feedback

Builder behavior:

- Day Speech Quality shows existing word bank items as feedback.
- Day General Feedback builds a broader word-bank grouping by merging current suggestion words and existing bank items.

**Technologies**

- `LanguageBankItem`
- `selectDailySuggestions`
- `scanTranscriptForUsage`
- `advanceMastery`
- Prisma

**Known gaps**

- The Day General Feedback word bank adds suggestion words as new first, then skips existing duplicates. If the same text exists in the real bank, the computed "new" version can hide the existing usage count, mastery state, or active target status. The merge order should prefer persisted bank metadata.

## Day Pronunciation & Intonation

Day Pronunciation is built by `buildDayPronunciation.ts`.

It contains:

1. Score Summary
2. Transcript Map, inserted after Score Summary by the UI
3. Phoneme Patterns
4. Priority Sounds
5. Rhythm & Intonation
6. Prosody Details
7. Practice Suggestion
8. Accent Polish

The schema also includes `pitchContour` and `pronunciationProgress`, but the current day builder does not produce those categories yet.

### Day Score Summary

**What the user sees**

- Day-level pronunciation average.
- Accuracy, fluency, completeness, prosody averages.

**How it is built**

Inputs:

- All `PronunciationReport` rows for sessions that day.

Builder behavior:

- Average `pronScore`.
- Average raw Azure accuracy/fluency/completeness/prosody scores.

**Technology/source routing**

- Azure Speech Pronunciation Assessment.

**Known gaps**

- The day summary uses raw percent-style Azure scores in the items, while app pillar scores use mapped 1-10 metric snapshots. The UI should be clear about scale.

### Day Transcript Map / Improved Version

**What the user sees**

- Each session grouped under the day.
- Pronunciation map tab.
- Improved version tab.
- Clickable words open phoneme detail.

**Current files**

- `buildDayTranscript.ts`
- `DayTranscriptSections.tsx`

**How it is built**

Inputs:

- `Transcript.text`
- `Transcript.improvedText`
- `WordPronunciation` rows

Builder behavior:

- Tokenize transcript text.
- Match word tokens to pronunciation rows with a cursor.
- Attach score band:
  - green for strong
  - amber below 85
  - red below 60 or omission
  - gray italic for insertion
- Preserve `offsetMs` and `durationMs` for phoneme detail.

**Technology/source routing**

- Whisper for transcript text.
- Azure for token-level pronunciation evidence.
- Rewrite service for improved text.

**Known gaps**

- Improved text has no pronunciation tokens, by design.
- If a selected token index carries across a tab switch, the UI must avoid rendering placeholder phoneme details for non-pronunciation modes.

### Day Phoneme Patterns

**What the user sees**

- Weakest repeated sounds for the whole day.

**How it is built**

Inputs:

- All `WordPronunciation.phonemes` rows from the day.

Builder behavior:

- Aggregate phoneme accuracy.
- Sort weakest repeated patterns.
- Show up to four items.

**Technology/source routing**

- Azure phoneme scoring.
- Deterministic aggregation.

### Day Priority Sounds

**What the user sees**

- Highest-impact pronunciation targets for the day.

**How it is built**

Inputs:

- All `WordPronunciation` rows from the day.

Builder behavior:

- Run `rankByFunctionalLoad`.
- Split into high/moderate priority and polish targets.
- Display top priority items.

**Technology/source routing**

- Azure phoneme data.
- Functional-load table.
- Spanish L1 structural heuristics.

### Day Rhythm & Intonation

**What the user sees**

- Top rhythm and intonation patterns across all sessions.

**How it is built**

Inputs:

- `breakErrorTypes`
- `intonationErrorTypes`

Builder behavior:

- Count all prosody tags.
- Sort descending.
- Show top three.

**Technology/source routing**

- Azure prosody feedback.

### Day Prosody Details

**What the user sees**

- Average speaking rate.
- Prosody score.
- Target WPM evidence.

**How it is built**

Inputs:

- `PronunciationReport.speakingRateWpm`
- `PronunciationReport.prosodyScore`

Builder behavior:

- Average speaking rate across reports.
- Compare to 110-140 WPM target.
- Mark tone as good or watch.

**Technology/source routing**

- Azure word timings.
- Deterministic target-range comparison.

### Day Pitch Contour

**What the user should see**

- A day/session pitch contour view grouped by session, if available.

**Current state**

- The session-level pitch API exists.
- The Day Pronunciation schema includes `pitchContour`.
- The current day builder does not add a `pitchContour` category.

**Technology/source routing**

- Praat/parselmouth service.
- `ChunkFeature` rows.
- Pitch contour stitching.

### Day Practice Suggestion

**What the user sees**

- One practice target derived from priority sounds.

**How it is built**

Inputs:

- Day priority sounds.

Builder behavior:

- Uses the first priority sound item.
- If no priority sound exists, shows the category summary as empty-state-like text.

**Technology/source routing**

- Azure plus functional-load ranking.

### Day Accent Polish

**What the user sees**

- Lower-impact pronunciation refinements.

**How it is built**

Inputs:

- Low-tier functional-load results.

Builder behavior:

- Show up to four polish items.

**Technology/source routing**

- Azure plus functional-load ranking.

### Day Pronunciation Progress

**What the user should see**

- Day-level progress compared with previous days or prior sessions.

**Current state**

- The session UI has `PronunciationProgress`.
- The Day Pronunciation schema includes `pronunciationProgress`.
- The day builder does not currently create this category.

**Technology/source routing**

- Historical `PronunciationReport` rows.
- Metric deltas across days.

## Day General Feedback

Day General Feedback is built by:

- `buildDayEvidenceBundle.ts`
- `buildDaySummaryNarrative.ts`
- `buildSuggestionWords.ts`
- `buildDayGeneralFeedback.ts`
- `DayGeneralFeedbackSection.tsx`

It contains:

1. Summary
2. 16 suggestion words
3. Active targets
4. Word Bank

### Day General Feedback Summary

**Desired output**

A 200-300 word daily coaching narrative with soul. It should explain:

- what went well
- what struggled
- patterns across sessions
- what changed compared with previous days when prior data exists
- how Speech Quality and Pronunciation & Intonation interacted
- tomorrow’s focus

It should not be a raw metric dump.

**Current implementation**

`buildDaySummaryNarrative` is deterministic and uses:

- session count
- total words
- pillar scores
- best pillar
- worst pillar
- high metrics
- weak metrics
- grammar issues
- naturalness flags
- pronunciation summary
- focus areas

**Technology/source routing**

- Deterministic narrative builder.
- Underlying metrics and evidence from session rows.
- No new model call in the current Day Detail general feedback builder.

**Known gaps**

- The current deterministic narrative can still sound mechanical because it composes metric sentences. It needs a better coaching template and prior-day comparison data.
- Previous-day comparison is available in the broader daily conclusion path, but not fully integrated into this 200-300 word Day Detail narrative.

### 16 Suggestion Words

**Desired output**

Exactly 16 practice candidates:

- 4 collocations
- 4 connectors
- 4 adjectives/adverbs, rotating by day
- 4 verbs, rotating between phrasal verbs, prepositional verbs, and useful high-frequency verbs

These are not just words the user said. They are words or patterns that would help fix weaknesses detected today.

**Current implementation**

`buildSuggestionWords` already enforces four families with four slots each.

Sources:

- `naturalness_flag`
- `vocabulary_insight`
- `structure_insight`
- `grammar_insight`
- `fallback_pool`

Selection behavior:

- Collocations come first from naturalness suggested phrases and vocabulary suggestions, then fallback collocations.
- Connectors come first from structure suggestions, then a weekday connector function pool.
- Adjectives/adverbs come from vocabulary suggestions, then a weekday adjective/adverb pool.
- Verbs come from grammar/vocabulary suggestions, then a rotating verb pool:
  - phrasal verbs
  - prepositional verbs
  - general useful verbs

**Technology/source routing**

- Day evidence bundle.
- Naturalness flags.
- Structured insight suggestions.
- Fallback pools.
- Date-based rotation.

**Important current fix already present**

The builder treats `insight.pattern` as a diagnostic label, not a suggestion word. It extracts practice items from quoted or parenthetical text in `insight.suggestion`.

**Known gaps**

- The UI currently renders each word with `word.reason`. Your desired UI should not show those explanations in the Suggestion Words list.
- The data should keep `reason` for Active Targets and evidence logs, but the visible list should be clean.
- Fallback items can still dominate when evidence extraction is weak. The next branch should improve evidence extraction from naturalness, grammar flags, and corpus-backed suggestions.

### Active Targets

**Desired output**

The 4 highest-priority items chosen from the 16 suggestion words. These are tomorrow’s focus. They should appear in:

- Day Detail
- subtle History day card when useful
- practice planning surface

**Current implementation**

`buildActiveTargets` ranks the 16 suggestion words by:

1. Whether the item family matches today’s weakest focus areas.
2. Whether the item came from evidence rather than fallback.

It maps metric keys to word families:

- connector/structure problems to connectors
- vocabulary/register problems to collocations or adjectives/adverbs
- grammar problems to verbs
- filler/speaking-rate problems to connectors/verbs

Pronunciation metrics are intentionally excluded from word-choice ranking.

**Technology/source routing**

- Day metric focus areas.
- Suggestion word source metadata.
- Deterministic ranking.

**Known gaps**

- History day card active targets come from `DailyConclusion.activeTargetsTomorrow`, while Day Detail active targets come from `buildDayGeneralFeedback`. These should be unified.
- Active target reasons should be shown in the Active Targets section, but not under every Suggestion Word.

### Word Bank

**Desired output**

A broader tracked vocabulary/pattern bank with:

- repeated patterns
- suggested words
- collocations
- verbs
- connectors
- items already being learned
- usage count
- mastery state
- active status
- why it matters

**Current implementation**

There are two related concepts:

1. **Persisted word bank** in `LanguageBankItem`.
2. **Day Detail read-model word bank** that merges today’s suggestion words and existing bank items.

The persisted language bank supports:

- `text`
- `lemmaOrPattern`
- `category`
- `source`
- `usageCount`
- `masteryState`
- `isActiveTarget`
- retargeting timestamps

Usage scanning happens through `scanTranscriptForUsage`. Mastery advances through `advanceMastery`.

**Technologies**

- Prisma/Postgres
- Deterministic usage scanning
- Mastery-state machine
- Category-based daily selection

**Known gaps**

- Day Detail word bank groups currently show usage count and mastery state but not "why it matters."
- Merge order should prefer persisted `LanguageBankItem` data over computed new suggestions for duplicates.
- The old `LanguageBankPanel` refers to 12 suggestions, while the new desired Day Detail model is 16 suggestion words plus 4 active targets. These surfaces need alignment.

## Logs / Evidence

Evidence is built by:

- `buildSessionEvidence.ts`
- `buildDayEvidence.ts`
- `EvidenceRegister`
- `EvidenceSections`
- `/api/logs/session/[id]`
- `/api/logs/day/[date]`

### Purpose

Evidence logs should not be coaching content. They are a register of source attribution.

They answer:

- Which table/row supported this claim?
- Which metric or transcript span was used?
- Was the source Whisper, AssemblyAI, Azure, corpus, language bank, or pipeline metadata?
- What raw value was stored?
- What display value did the UI show?

### Evidence Categories

| Evidence category | Built from | Purpose |
|---|---|---|
| Metrics | `MetricSnapshot` | Shows score source and timestamp |
| Transcript spans | `divergenceSpans` | Shows clean vs verbatim disagreement |
| Grammar | `grammarFlags` | Shows classification and grammar type |
| Pronunciation | `WordPronunciation` | Shows word-level pronunciation evidence |
| Naturalness | `NaturalnessFlag` | Shows original/suggested phrase and metric/rationale |
| Corpus | Corpus reference tables | Shows frequency, MI, attestation |
| Pipeline metadata | session fields | Shows ASR provider, verbatim provider, chunk count |

### Correct boundary

Main result card:

- User-facing coaching.
- Clean, readable, emotionally useful.
- No raw source labels under every item.

Evidence register:

- Source attribution.
- Raw values.
- Transcript spans.
- Flags.
- Rationale.
- No invented hidden reasoning.

## Corrected Source Routing Matrix

| Output | Session card source | Day card source | Correct primary channel | Supporting channel |
|---|---|---|---|---|
| Hero date | `createdAt` | date param / `DailyConclusion.date` | DB | none |
| Overall score | metric aggregates | `DailyConclusion.overallScore` or fallback aggregation | Metric snapshots | none |
| Total sessions | not applicable | completed sessions count | DB | none |
| Total minutes | `durationSecs` | sum of `durationSecs` | DB | chunk duration fallback |
| Total words | `Transcript.wordCount` | sum transcript or verbatim word count | Whisper clean transcript | AssemblyAI fallback |
| Focus areas | weak metric keys | lowest day metric averages | Metric snapshots | source-aware metric routing |
| Topic sentence | `summary` / `intentLabel` | `DailyConclusion.topicSentence` | Daily conclusion | prompt/topic labels |
| Grammar | insights + grammar flags | `verbAccuracy`, grammar flags, insights | AssemblyAI + divergence + grammar flags | clean transcript patterns |
| Vocabulary | vocabulary insights | vocab metrics + insights | Whisper + corpus | AssemblyAI repetitions |
| Structure | structure insights | structure metrics + insights | Whisper | AssemblyAI for repetition/false starts |
| Register & Pragmatics | register feedback | register metric + register feedback | hybrid | prompt context |
| Naturalness | naturalness flags | naturalness flags | AssemblyAI + corpus | deterministic L1 checks |
| Word Bank | language bank panel | language bank groups | LanguageBankItem | suggestion words |
| Score Summary | pronunciation report | aggregated pronunciation reports | Azure | none |
| Transcript Map | transcript + word pronunciation | per-session transcript tokens | Whisper + Azure | AssemblyAI compare |
| Improved Version | transcript rewrite | per-session improved text | rewrite output | vocabulary suggestions |
| Phoneme Patterns | aggregate phonemes | aggregate day phonemes | Azure phonemes | SAPI-to-IPA map |
| Priority Sounds | functional-load ranking | day functional-load ranking | Azure + functional load | Spanish L1 structural rules |
| Rhythm & Intonation | Azure prosody tags | count Azure prosody tags | Azure | Praat visual support |
| Prosody Details | speaking rate/prosody | averaged speaking rate/prosody | Azure word timing | none |
| Pitch Contour | pitch API | not yet built in day builder | Praat | Azure prosody context |
| Practice Suggestion | top pronunciation target | top priority sound | Azure + functional load | prior history |
| Accent Polish | low-priority FL targets | low-priority FL targets | Azure + functional load | none |
| Pronunciation Progress | prior reports | not yet built in day builder | historical reports | daily deltas |
| Summary | session analysis summary | day narrative builder | source-aware aggregate | prior day comparison |
| 16 suggestion words | not primary session UI | day suggestion builder | day evidence | fallback pools |
| Active targets | language bank target cards | top 4 from 16 | suggestion ranking | weak metric families |
| Logs/Evidence | session evidence bundle | day evidence bundle | DB rows | source metadata |

## Highest-Priority Corrections

### 1. Route AssemblyAI into scoring before final output

Metrics that should use AssemblyAI:

- `fillerUsage`
- false starts
- repetitions
- grammar candidate detection
- connector repetition when the connector is actually repeated in speech
- naturalness exact phrasing

The next branch should pass verbatim transcript and divergence spans into the final analysis/synthesis stage or apply deterministic post-synthesis overrides.

### 2. Make grammar flags reliable

The database can store:

- `verbatimTranscript`
- `verbatimWordCount`
- `divergenceSpans`
- `grammarFlags`

But recent data showed divergence spans without grammar flags. The next branch should make grammar classification observable and reliable:

- log skip reasons
- persist an empty classified result intentionally when no grammar issues exist
- distinguish "no grammar issues" from "classifier did not run"
- ensure `verbAccuracy` is corrected only after classification status is known

### 3. Clean Suggestion Words UI

The Day Detail Suggestion Words section should render:

- Collocations
- Connectors
- Adjectives / Adverbs
- Verbs

Each group should show only the four terms. No source labels and no reason sentence under each item. Reasons belong in Active Targets or Evidence.

### 4. Unify active targets

The four active targets should be one canonical set shared by:

- Day Detail
- History day card
- Language Bank
- future drills

The current system has multiple target-selection paths.

### 5. Persist and parse Register & Pragmatics consistently

Needed:

- Add `registerFeedback` to `useSessionStatus` schema.
- Ensure all pipeline variants persist register feedback.
- Give Day Detail register category concrete items from `registerFeedback.suggestions`, not only metric averages.

### 6. Wire Naturalness across all pipeline variants

Needed:

- Ensure final session-level naturalness flags are persisted for chunk and non-chunk paths.
- Prefer AssemblyAI exact phrasing plus corpus grounding.
- Keep naturalness flags out of Suggestion Words unless they produce a real practice phrase.

### 7. Complete day pronunciation missing categories

The schema includes:

- `pitchContour`
- `pronunciationProgress`

The current day builder does not produce those categories. Either implement them or remove them from the visible contract until they are supported.

### 8. Preserve Word Bank metadata

When today’s suggestion duplicates an existing `LanguageBankItem`, the Day Detail word bank should keep:

- existing mastery state
- usage count
- active target status
- source history

Computed suggestions should not overwrite persisted learning state.

## Recommended Next Branch

Recommended branch:

`fix/assemblyai-metric-source-routing`

Recommended scope:

1. Feed verbatim evidence into final session analysis or add post-analysis metric overrides.
2. Stabilize grammar flag persistence and observability.
3. Correct filler/repetition/false-start metrics to use AssemblyAI.
4. Persist/parse register feedback consistently.
5. Wire naturalness consistently.
6. Clean Day Detail Suggestion Words rendering.
7. Unify active targets between Day Detail and History day card.

Defer until after that branch:

- Evidence Logs page polish.
- Day-level pitch contour.
- Day-level pronunciation progress.
- Word Bank "why it matters" copy.
- More human daily narrative templates.

## Final Desired User Experience

The user should feel this structure:

1. **The session card tells me what happened in this recording.**
2. **The day card tells me what today means.**
3. **Speech Quality explains my language choices.**
4. **Pronunciation & Intonation explains how I sounded.**
5. **General Feedback gives me a human coaching read for tomorrow.**
6. **Suggestion Words gives me exactly 16 useful practice candidates, grouped cleanly.**
7. **Active Targets tells me the 4 things to use tomorrow.**
8. **Word Bank tracks what I am learning over time.**
9. **Evidence Logs prove where every claim came from without polluting the coaching UI.**

That distinction matters. The main card should have soul. The evidence register should have receipts.
