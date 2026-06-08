# PR — v0.70.0 — Evidence-Backed Result IA + Logs Register

**Branch:** `feat/evidence-backed-results-ia`

## Summary

- Fixed useSessionStatus verbatim field stripping bug (Compare tab now works)
- Corrected session result and day detail IA: transcript map moved under Pronunciation → Score Summary tabs
- Added evidence type contracts and read model builders
- Added Logs page as evidence register (`/logs/session/[id]`, `/logs/day/[date]`)

## What Was Built

### Bug Fix
4 verbatim fields (`verbatimTranscript`, `verbatimWordCount`, `divergenceSpans`, `verbatimProvider`) were missing from the Zod schema in `useSessionStatus.ts`. The API returned them, the types declared them, but Zod stripped them on parse. Compare tab now works.

### IA Correction
- **Session result:** Removed top-level "Annotated Transcript" section. Transcript tabs now live inside Pronunciation & Intonation → after Score Summary header.
- **Day detail:** Removed top-level "Transcript" section (was section 5). Transcript Map / Improved Version tabs now render inside Pronunciation & Intonation → Score Summary.
- **Word map compatibility:** Pronunciation map output is identical — same colors, score bands, clickable words, detail panel, spacing, line breaks.
- **Fallback:** Sessions without pronunciation data show transcript via `TranscriptOnlySection`.

### Evidence Architecture
- `src/lib/evidence/` — type contracts (EvidenceSource, EvidenceRef, EvidenceItem, MetricEvidence, etc.) + 6 builders + 2 orchestrators
- Read model from existing DB rows (MetricSnapshot, WordPronunciation, NaturalnessFlag, grammarFlags JSON, divergenceSpans JSON)
- No new database tables

### Logs Page
- `/logs/session/[id]` — all evidence for a session
- `/logs/day/[date]` — all evidence for a day
- Tables: Metrics, Transcript Spans, Grammar, Pronunciation, Naturalness, Corpus, Pipeline Metadata
- "View evidence →" links on session result and day detail pages

## Architecture Decisions

- Evidence is a read model, not a cache — built on demand from existing rows
- Corpus evidence builder is a stub (returns empty) — will be wired when cross-referencing session vocabulary against Lexeme/Collocation tables
- SelectionRationale table deferred — Logs v1 shows existing evidence only
- `PronunciationDetailSections` extracted to keep `PronunciationFeedbackSection` under 80 lines
- `EvidenceSections` extracted from `EvidenceRegister` for same reason

## Testing

- 2 new verbatim parsing tests in `useSessionStatus.test.ts`
- 4 updated IA tests in `DayDetailContent.test.tsx` (no top-level Transcript, transcript tabs present, evidence link)
- 4 evidence type contract tests
- All tests pass (1553 passing)
- `npm run typecheck` — clean
- `npm run lint` — clean
- `npm run build` — passes, both logs routes registered

## Deployment Notes

No database migration needed. No env var changes. Both logs routes are new pages — no breaking changes to existing URLs.
