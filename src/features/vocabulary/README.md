# Vocabulary Feature

> Implements a spaced-repetition system (SRS) for vocabulary items — words, collocations, and phrases — extracted from the user's speaking sessions.

## Responsibilities
- Fetching and managing the SRS review queue (due items sorted by `nextReviewAt`)
- Rendering flashcard-style review cards with rating controls (Again / Hard / Good / Easy)
- Submitting review ratings and updating SRS intervals via the API
- Displaying vocabulary statistics: total items, due count, adoption rate, domain and type breakdowns
- Tabbed navigation between the review queue and stats views
- Zod schema validation for all API responses

## Key Modules
| File / Folder | Purpose |
|---------------|---------|
| `vocabulary.schemas.ts` | Shared Zod schemas: `ReviewCardItemSchema`, `VocabItemSchema`, `VocabStatsDataSchema` |
| `ReviewQueue/` | Queue manager component; `useReviewQueue` fetches `/api/users/me/vocabulary/review-queue` and handles rating submission |
| `ReviewCard/` | Flashcard component showing word, meaning, example sentence, domain, and frequency band; `useReviewCard` manages flip/reveal state |
| `VocabStats/` | Statistics view; `useVocabStats` fetches `/api/users/me/vocabulary/stats` |
| `VocabTabs/` | Tab bar toggling between Review and Stats views; `useVocabTabs` manages active tab state |

## Data Flow
- `useReviewQueue` GETs due items from `/api/users/me/vocabulary/review-queue`; validated with `ReviewQueueResponseSchema`.
- On rating, POSTs to `/api/users/me/vocabulary/:id/review`; the rated item is removed from local state optimistically.
- `useVocabStats` GETs aggregate stats from `/api/users/me/vocabulary/stats`; validated with `VocabStatsDataSchema`.
- Vocabulary items are created upstream by the session analysis pipeline (not in this feature).

## Conventions
- 4-file component pattern; types in `.types.ts`; barrel exports via `index.ts`.
- Item types: `word | collocation | phrase`.
- SRS intervals and scheduling logic live server-side in the API layer.
