# PR-0.55.0 — Intelligence Features
**Branch:** `feat/intelligence-features` → `main`
**Version:** `0.55.0`
**Date:** 2026-05-31
**Status:** Ready to merge
---
## Summary
Three intelligence features that turn raw analysis into actionable learning: phoneme pattern analysis (aggregate weak sounds), vocabulary tracking across sessions (suggested → adopted feedback loop), and a Reading Practice drill mode (AI generates targeted text).

## Files Changed
| File | Action | Notes |
|------|--------|-------|
| `prisma/schema.prisma` | Modified | VocabSuggestion model + User/SpeakingSession back-relations |
| `prisma/migrations/20260531221528_add_vocab_suggestion/` | Created | New table with unique (userId, word) constraint |
| `src/lib/pronunciation/aggregatePhonemes.ts` | Created | Aggregates per-phoneme scores, returns top 5 weak sounds with IPA |
| `src/lib/pronunciation/aggregatePhonemes.test.ts` | Created | 11 tests — thresholds, dedup, caps, invalid data |
| `src/components/ui/PhonemePatterns/` | Created | 4-file component — collapsible weak phoneme list with ScoreChips |
| `src/app/(app)/session/[id]/page.tsx` | Modified | Wired PhonemePatterns + VocabProgress into results page |
| `src/lib/pipeline/persistVocabSuggestions.ts` | Created | Saves Claude vocab suggestions to DB after analysis |
| `src/lib/pipeline/detectVocabUsage.ts` | Created | Checks transcripts for previously suggested words with morphological matching |
| `src/lib/pipeline/processFinal.ts` | Modified | Vocab persist + detect wired into both pipeline paths |
| `src/lib/pipeline/__tests__/processFinal.test.ts` | Modified | Added vocabSuggestion mock to Prisma mock |
| `src/lib/pipeline/__tests__/vocabIntelligence.test.ts` | Created | 15 tests — wordForms, persist, detect usage |
| `src/components/ui/VocabProgress/` | Created | 4-file component — adoption tracker ("3/8 words adopted") |
| `src/app/api/users/me/vocabulary/route.ts` | Created | GET endpoint listing user's vocab suggestions |
| `src/lib/ai/generateReadingPractice.ts` | Created | Claude Haiku generates practice text targeting weak sounds |
| `src/lib/ai/generateReadingPractice.test.ts` | Created | 5 tests — response parsing, code fences, error handling |
| `src/app/api/drills/reading-practice/route.ts` | Created | POST endpoint with Zod validation + CSRF |
| `src/features/training/ReadingPractice/` | Created | 4-file feature — state machine + difficulty selector + text display |
| `src/app/(app)/drill/reading-practice/page.tsx` | Created | Next.js route for reading practice |
| `src/features/recording/WaveformVisualizer/WaveformVisualizer.tsx` | Modified | Centered bars on mobile (justify-center + max-w-xs + items-center) |

## Architecture Decisions
| Decision | Why |
|----------|-----|
| VocabSuggestion as separate table (not JSON on session) | Enables cross-session tracking — "was this word used later?" |
| `skipDuplicates` on createMany | Same word suggested in multiple sessions shouldn't create duplicates |
| `wordForms()` simple stemmer | Covers 90%+ of English inflections without NLP dependency |
| Reading Practice text-gen only | Recording + Azure pronunciation assessment integration is a separate packet |
| Phoneme threshold at 70 | Matches Azure's "needs improvement" range; avoids flooding with borderline scores |

## Testing Checklist
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes
- [ ] `npm run lint` — 0 new warnings
- [ ] `npm test` — 897+ passing, 0 failing
- [ ] Record session > 2 min → PhonemePatterns appears in Pronunciation section (if any phoneme < 70)
- [ ] Record 2+ sessions → VocabProgress shows suggested words with adoption status
- [ ] `/drill/reading-practice` generates text at all 3 difficulty levels
- [ ] Waveform bars centered on mobile during recording

## Deployment Notes
- **Migration required:** `npx prisma migrate deploy` creates `vocab_suggestions` table
- No new environment variables
- No breaking changes to existing features
