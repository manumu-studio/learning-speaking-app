# Entry 63 — 2026-06-01

**Type:** Feature
**Branch:** `feat/reading-practice-library`
**Version:** 0.57.0

## Summary

Built the Reading Practice Library — a personalized pronunciation training feature that replaces the previous generic stub. Users now see a library of their past sessions with pronunciation weaknesses highlighted, can select a session and difficulty level, generate AI-targeted practice text, record themselves reading it aloud, and receive word-by-word pronunciation scores via Azure Speech assessment.

Also added catch-all not-found pages to redirect unknown app routes to dashboard and unknown root routes to home.

## Files Created

- `src/app/api/users/me/reading-practice-sessions/route.ts` — API endpoint aggregating per-session pronunciation weaknesses + vocab + global weak phonemes
- `src/app/api/drills/reading-practice/assess/route.ts` — Pronunciation assessment endpoint accepting audio + reference text via FormData
- `src/app/not-found.tsx` — Root catch-all redirecting to home
- `src/app/(app)/not-found.tsx` — App catch-all redirecting to dashboard

## Files Modified

- `src/features/training/ReadingPractice/ReadingPractice.types.ts` — Added library types (sessions, global weaknesses, mispronounced words, vocab)
- `src/features/training/ReadingPractice/useReadingPractice.ts` — Rewired as library + practice state machine with recording + assessment flow
- `src/features/training/ReadingPractice/ReadingPractice.tsx` — Replaced stub with library view (global summary + session cards) + practice view (difficulty picker + AI text + recording + word-by-word results)
- `src/features/training/ReadingPractice/index.ts` — Updated barrel exports

## Key Decisions

- **Library replaces stub** — the old generic reading practice page passed empty arrays for phonemes/vocab, making it useless. The library is now the landing page at `/drill/reading-practice`.
- **Direct audio upload via FormData** — for short reading practice recordings (10-30s), skipped R2 presigned URL flow and send audio directly to the assess endpoint. Simpler flow, no orphaned files.
- **Single-chunk recording** — set `chunkDurationSecs` to 300 on `useAudioWorklet` so it never chunks. Reading practice texts are short.
- **Per-session + global aggregation** — API returns both per-session weak phonemes/words and a global aggregation across all sessions, so the library shows "Your Focus Areas" at the top.
- **Word-by-word color coding** — results show each word colored by accuracy (green ≥80, amber ≥60, orange <60) with target words underlined.

## Rationale

The reading practice feature was previously a dead-end stub. Users had no way to get personalized practice targeting their actual weaknesses. This implementation closes the loop: session data → weakness extraction → AI text generation → recording → pronunciation assessment → visual feedback.
