# PR-0.58.0 — Collocation SRS + Domain Vocabulary

**Branch:** `feat/collocation-srs-domain-vocab` → `main`
**Version:** `0.58.0`
**Date:** 2026-06-01
**Status:** ✅ Ready to merge

---

## Summary

Transforms the passive vocabulary suggestion system into an active spaced-repetition learning loop. Claude now detects weak collocations and classifies vocabulary by domain and frequency band. Users review items in an SRS queue with SM-2 scheduling, and usage detection in subsequent sessions auto-advances items.

## What's New

- **Spaced Repetition System**: SM-2 algorithm schedules reviews at increasing intervals. Four rating levels (Again/Hard/Good/Easy) adjust the schedule.
- **Collocation Detection**: Claude identifies non-native-sounding word combinations and suggests higher-MI native alternatives.
- **Domain & Frequency Classification**: Each vocabulary item tagged with domain (general/business/tech/academic/medical/legal) and frequency band (high/mid/low/rare).
- **10th Metric — Lexical Sophistication**: Measures the ratio of mid-to-rare vocabulary in speech. Added to the Language pillar on the dashboard.
- **Vocabulary Page** (`/vocabulary`): Tabbed interface with Review Queue, All Vocabulary, and Collocations tabs. Stats footer shows totals, adoption rate, and domain breakdown.
- **Auto-Rating**: When a previously suggested word is detected in a new session, the SRS schedule auto-advances (only after the user has manually reviewed at least once).

## Architecture Decisions

| Decision | Why |
|----------|-----|
| SM-2 as pure function | Fully testable, no Prisma dependency, deterministic scheduling |
| Auto-rate only after manual engagement | Prevents SRS from penalizing items the user hasn't seen yet |
| Collocation detection via Claude | Leverages existing analysis pass, no separate NLP service |
| 10th metric in Language pillar | Lexical sophistication measures word-choice quality, naturally fits alongside Vocabulary Precision |

## Migration Notes

- **Prisma migration `20260601153842_add_vocab_srs_fields`**: Adds 8 columns to `vocab_suggestions` table. Includes SQL backfill that sets `nextReviewAt = createdAt + 1 day` for all existing rows.
- Migration is safe to run on production — all new columns have defaults, existing data is preserved.

## Testing Checklist

- [x] SM-2 scheduler: 10 test cases covering first review, subsequent reviews, lapses, ease factor bounds
- [x] Auto-rating: 5 test cases covering all branches
- [x] Type check: `npx tsc --noEmit` — 0 errors
- [x] Build: `npm run build` — success
- [x] Full test suite: 135 files, 974+ tests, 0 failures
- [ ] Manual: Navigate to `/vocabulary`, verify tabs and review queue
- [ ] Manual: Record a session, verify new vocab has type/domain/frequencyBand
- [ ] Manual: Submit a review rating, verify next review date updates

## Deployment Notes

1. Run `npx prisma migrate deploy` to apply the migration
2. Existing vocabulary items will be backfilled with SRS defaults
3. No new environment variables required
4. No breaking API changes — existing vocab endpoint returns additional fields

## Validation

```
npx tsc --noEmit     → 0 errors
npm run build        → success
npm run lint         → 0 warnings
vitest run           → 135 files, 974+ tests, 0 failures
```
