# ENTRY-64 — Collocation SRS + Domain Vocabulary

**Date:** 2026-06-01
**Type:** Feature
**Branch:** `feat/collocation-srs-domain-vocab`
**Version:** `0.58.0`

---

## What I Did

Added a spaced-repetition system (SRS) to the vocabulary pipeline, turning passive vocab suggestions into an active learning loop. The system detects weak collocations in speech, classifies vocabulary by domain and frequency band, and provides a review queue with SM-2 scheduling.

Key deliverables:
- SM-2 spaced repetition scheduler (pure function with comprehensive tests)
- Auto-rating from usage detection (words used in speech auto-advance in SRS)
- Claude analysis extension: collocation detection + lexical sophistication scoring
- 10th metric: Lexical Sophistication added to the Language pillar
- Three new API routes: review queue, review submission, vocabulary stats
- Full vocabulary page with tabbed UI (Review Queue / All / Collocations)
- Prisma migration with backfill for existing vocabulary items

## Files Touched

| File | Action | Notes |
|------|--------|-------|
| `prisma/schema.prisma` | Modified | SRS fields, type, domain, frequencyBand on VocabSuggestion |
| `prisma/migrations/20260601153842_add_vocab_srs_fields/` | Created | Migration + backfill SQL |
| `src/lib/srs/sm2.ts` | Created | SM-2 algorithm (pure function) |
| `src/lib/srs/sm2.types.ts` | Created | ReviewRating, SrsState, SrsResult types |
| `src/lib/srs/autoRate.ts` | Created | Auto-rate from usage detection signals |
| `src/lib/srs/__tests__/sm2.test.ts` | Created | 10 test cases for SM-2 |
| `src/lib/srs/__tests__/autoRate.test.ts` | Created | 5 test cases for auto-rating |
| `src/lib/ai/analyze.ts` | Modified | Collocation prompt, lexical sophistication, vocab type/domain/freq |
| `src/lib/metric-keys.ts` | Modified | Added lexicalSophistication |
| `src/features/dashboard/pillars.ts` | Modified | lexicalSophistication in Language pillar |
| `src/features/dashboard/dashboard.types.ts` | Modified | MetricKey union now 10 keys |
| `src/features/dashboard/getDashboardData.ts` | Modified | 10-metric support |
| `src/features/dashboard/todaysWorkout.ts` | Modified | Fallback tip for lexicalSophistication |
| `src/lib/personalRecords.ts` | Modified | 10-metric labels |
| `src/lib/schemas/trends.ts` | Modified | MetricKeySchema now 10 keys |
| `src/lib/pipeline/persistVocabSuggestions.ts` | Modified | Accept type/domain/frequencyBand, set nextReviewAt |
| `src/lib/pipeline/detectVocabUsage.ts` | Modified | SRS auto-rating on vocab detection |
| `src/app/api/users/me/vocabulary/route.ts` | Modified | Return new fields |
| `src/app/api/users/me/vocabulary/review-queue/route.ts` | Created | GET due items |
| `src/app/api/users/me/vocabulary/[id]/review/route.ts` | Created | POST review rating |
| `src/app/api/users/me/vocabulary/stats/route.ts` | Created | GET stats + breakdowns |
| `src/features/vocabulary/ReviewCard/` | Created | 4-file component |
| `src/features/vocabulary/ReviewQueue/` | Created | 4-file component |
| `src/features/vocabulary/VocabStats/` | Created | 4-file component |
| `src/features/vocabulary/VocabTabs/` | Created | 4-file component |
| `src/app/(app)/vocabulary/page.tsx` | Created | Next.js route |

## Decisions

- **SM-2 over simpler algorithms**: SM-2 is well-proven for language learning, adapts interval and ease factor per item, and handles lapses gracefully. Pure function design enables easy testing.
- **Auto-rating only after manual engagement**: Items auto-rate from usage detection only if `reviewCount > 0`, preventing SRS from penalizing items the user hasn't manually engaged with yet.
- **10th metric (Lexical Sophistication)**: Added as a Claude-scored metric measuring the ratio of mid/low/rare vocabulary to total content words. Placed in the Language pillar alongside Vocabulary Precision.
- **Collocation detection via Claude**: Rather than implementing a separate NLP pipeline, collocations are detected by Claude during the existing analysis pass. This keeps infrastructure simple while leveraging LLM understanding of native-sounding word combinations.
- **Gym-coach rating colors**: Orange (Again) / Amber (Hard) / Sky (Good) / Emerald (Easy) — no red for errors, consistent with the app's coaching tone.

## Still Open

- `analyze.ts` is now 579 lines — needs extraction of prompt builders into separate modules
- Session results page, ReadingPractice, and processFinal also need splitting (all >400 lines)

## Validation

```
npx tsc --noEmit     → 0 errors
npm run build        → success
npm run lint         → 0 warnings
vitest run           → 135 files, 974+ tests, 0 failures
```
