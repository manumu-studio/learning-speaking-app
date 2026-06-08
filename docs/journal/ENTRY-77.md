# Entry 77 — 2026-06-08 — Evidence-Backed Result IA

**Type:** Enhancement / Architecture
**Branch:** feat/evidence-backed-results-ia
**Version:** 0.70.0

## Summary

Corrected the session result and day detail information architecture from the previous release. Moved transcript map from top-level section into Pronunciation & Intonation → Score Summary tabs. Added evidence type contracts, evidence read model builders, and a Logs page as an evidence register. Fixed the useSessionStatus verbatim field stripping bug that prevented the Compare tab from appearing.

## Key Decisions

- Transcript map moves under Pronunciation → Score Summary, not top-level — this gives pronunciation its full depth while keeping transcript accessible
- Word pronunciation map output stays exactly the same: same colors, score bands, clickable words, detail panel, statistics, punctuation, spacing, line breaks — only location changed
- Evidence architecture is a read model from existing DB rows — no new tables in v1
- Logs page as evidence register — no fake AI thoughts, only real DB-backed evidence with source system, raw values, and timestamps
- SelectionRationale table deferred to a future release
- Sessions without pronunciation data still show transcript via TranscriptOnlySection fallback

## Files Created

- `src/lib/evidence/evidence.types.ts` — evidence type contracts
- `src/lib/evidence/build*.ts` — 6 evidence builders + 2 orchestrators
- `src/lib/evidence/index.ts` — barrel export
- `src/app/api/logs/session/[id]/route.ts` — session evidence API
- `src/app/api/logs/day/[date]/route.ts` — day evidence API
- `src/app/(app)/logs/session/[id]/page.tsx` — session logs page
- `src/app/(app)/logs/day/[date]/page.tsx` — day logs page
- `src/features/logs/EvidenceRegister/` — register component (4-file pattern)
- `src/features/logs/EvidenceTable/` — generic evidence table (3-file pattern)
- `src/features/logs/EvidenceRegister/EvidenceSections.tsx` — table section rendering
- `src/lib/evidence/evidence.types.test.ts` — evidence contract tests

## Files Modified

- `src/features/session/useSessionStatus.ts` — added 4 verbatim fields to Zod schema + transform
- `src/app/(app)/session/[id]/SessionFeedbackSections.tsx` — moved TranscriptToggle into PronunciationFeedbackSection, extracted PronunciationDetailSections
- `src/app/(app)/session/[id]/SessionDoneView.tsx` — removed TranscriptSection, added fallback + evidence link
- `src/features/history/DayDetailContent/DayDetailContent.tsx` — removed top-level TranscriptSection, added TranscriptMapTabs inside pronunciation scoreSummary, added evidence link
- `src/features/session/useSessionStatus.test.ts` — added verbatim parsing tests
- `src/features/history/DayDetailContent/DayDetailContent.test.tsx` — updated IA assertions, added transcript tab and evidence link tests
- `package.json` — version bump to 0.70.0

## Rationale

The previous release flattened the IA too much and placed transcript as a top-level day section. The corrected hierarchy gives pronunciation its full depth (Score Summary → transcript tabs → word-level annotation) while keeping the transcript accessible. The evidence architecture enables traceability from any user-facing claim back to real DB data, and the Logs page provides a power-user view for inspecting exactly what data produced each score and insight.
