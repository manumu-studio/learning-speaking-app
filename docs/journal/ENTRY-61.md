# Entry 61 — 2026-05-31

**Type:** Feature
**Branch:** `feat/intelligence-features`
**Version:** 0.55.0

## Summary

Added three intelligence features that transform raw session analysis into actionable learning: phoneme pattern analysis, vocabulary tracking across sessions, and a new Reading Practice drill mode.

## What was built

### Phoneme Pattern Analysis
- `aggregatePhonemes.ts` — aggregates per-phoneme Azure accuracy scores across all words, identifies the bottom 5 weak sounds (below 70 average), maps SAPI codes to IPA symbols using the existing `sapiToIpa` mapping
- `PhonemePatterns` component (4-file pattern) — collapsible "Sounds to Practice" section showing IPA symbol, average score with ScoreChip, occurrence count, and example words
- Wired into the session results page between PronunciationSection and WordColorMap

### Vocabulary Tracking
- `VocabSuggestion` Prisma model with unique `(userId, word)` constraint — tracks which words Claude suggested and whether the user later used them
- `persistVocabSuggestions.ts` — saves vocabulary suggestions to DB after Claude analysis, normalizes to lowercase, skips duplicates
- `detectVocabUsage.ts` — checks transcripts against pending suggestions using morphological matching (`wordForms` generates plurals, past tense, progressive, comparative variants)
- Wired into both `processFinal` (single-chunk) and `processParallelFinal` (multi-chunk) pipeline paths
- `VocabProgress` component (4-file pattern) — shows adoption status ("3/8 words adopted") with dates
- `GET /api/users/me/vocabulary` — API route listing user's vocabulary suggestions

### Reading Practice
- `generateReadingPractice.ts` — Claude Haiku generates 2-4 sentence texts targeting weak phonemes and vocabulary at selected difficulty level
- `POST /api/drills/reading-practice` — Zod-validated endpoint with CSRF protection
- `/drill/reading-practice` page with difficulty selector and text generation (recording integration is a placeholder for future work)
- `ReadingPractice` feature (4-file pattern) with `useReadingPractice` state machine hook

### Mobile Waveform Fix
- Centered waveform bars horizontally (`justify-center`) and capped width (`max-w-xs`) so bars don't bunch to the left on mobile
- Changed vertical alignment to `items-center` so bars grow outward from center axis

## Files touched

### Created (19 files)
- `prisma/migrations/20260531221528_add_vocab_suggestion/migration.sql`
- `src/lib/pronunciation/aggregatePhonemes.ts` + `.test.ts`
- `src/lib/pipeline/persistVocabSuggestions.ts`
- `src/lib/pipeline/detectVocabUsage.ts`
- `src/lib/pipeline/__tests__/vocabIntelligence.test.ts`
- `src/lib/ai/generateReadingPractice.ts` + `.test.ts`
- `src/components/ui/PhonemePatterns/` (4 files)
- `src/components/ui/VocabProgress/` (4 files)
- `src/features/training/ReadingPractice/` (4 files)
- `src/app/(app)/drill/reading-practice/page.tsx`
- `src/app/api/drills/reading-practice/route.ts`
- `src/app/api/users/me/vocabulary/route.ts`

### Modified (4 files)
- `prisma/schema.prisma` — VocabSuggestion model + User/SpeakingSession relations
- `src/lib/pipeline/processFinal.ts` — vocab persist + detect wired into both pipeline paths
- `src/lib/pipeline/__tests__/processFinal.test.ts` — added vocabSuggestion mock
- `src/app/(app)/session/[id]/page.tsx` — PhonemePatterns + VocabProgress wired in
- `src/features/recording/WaveformVisualizer/WaveformVisualizer.tsx` — centered bars

## Key decisions

| Decision | Rationale |
|----------|-----------|
| Reuse existing `sapiToIpa.ts` mapping | Already has 40 SAPI codes with tests — no duplication |
| `skipDuplicates: true` for vocab persistence | Same word suggested in multiple sessions shouldn't create duplicate rows |
| Morphological matching via `wordForms()` | Simple stemmer covers common English inflections without a full NLP library |
| Reading Practice as text-gen only (no recording) | Recording integration requires significant AudioRecorder + Azure pipeline wiring — better as a follow-up packet |
| Vocab detection in both pipeline paths | Single-chunk and multi-chunk sessions both need tracking |

## Quality gates

```
npx tsc --noEmit — pass
npm run build — pass
npm run lint — 0 new warnings
npm test — 897 passed, 4 skipped (31 new tests)
```
