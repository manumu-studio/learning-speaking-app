# Entry 62 — 2026-06-01

**Type:** Feature
**Branch:** `feat/intelligence-features`
**Version:** 0.56.0

## Summary

Added vocabulary-enhanced transcripts — after each session, Claude rewrites the user's transcript to naturally incorporate the 2-3 vocabulary words it suggested during analysis. Users can toggle between their original words and the improved version, with upgraded vocabulary bolded.

## What Changed

- **Prisma migration** — Added `improvedText` (nullable text) and `wordsUsed` (string array) to the Transcript model
- **rewriteTranscript function** — Claude Haiku takes the polished transcript + vocab suggestions, returns a lightly upgraded version with those words woven in. Skips transcripts under 20 words or when no suggestions exist
- **TranscriptToggle component** — Two-tab toggle ("Your words" / "Improved") with regex-based word highlighting using `<strong>` tags. Falls back to AnnotatedTranscript when no improved text exists
- **Pipeline integration** — Wired into `processFinal` after vocab suggestions are persisted. The parallel pipeline path doesn't produce vocab suggestions, so improved transcripts are only generated for sessions using the sequential path
- **Backfill endpoint** — Internal API and standalone script to retroactively generate improved transcripts for existing sessions that have vocab suggestions

## Key Decisions

- **Light upgrade, not a rewrite** — The prompt instructs Claude to keep the speaker's meaning, structure, and tone. Only word choice changes. If a suggested word doesn't fit naturally, it's skipped
- **Parallel path excluded** — `processParallelFinal` uses `synthesizeAnalysis` which doesn't produce vocabulary suggestions. The toggle is hidden for those sessions (graceful degradation)
- **Client-side highlighting** — Rather than having Claude mark the words, we use the `wordsUsed` array to bold matches with a regex. Simpler and more reliable

## Files Created

- `prisma/migrations/20260601074228_add_improved_transcript/migration.sql`
- `src/lib/ai/rewriteTranscript.ts` + `rewriteTranscript.test.ts`
- `src/components/ui/TranscriptToggle/` (4-file pattern)
- `src/app/api/internal/backfill-improved-transcripts/route.ts`
- `scripts/backfill-improved-transcripts.ts`

## Files Modified

- `prisma/schema.prisma` — Transcript model
- `src/lib/pipeline/processFinal.ts` — Wired rewrite call
- `src/features/session/useSessionStatus.ts` — Updated Zod schema
- `src/features/session/useSessionStatus.types.ts` — Updated transcript type
- `src/app/(app)/session/[id]/page.tsx` — Wired TranscriptToggle
- `src/app/(app)/session/[id]/page.test.tsx` — Updated mock
- `src/lib/pipeline/__tests__/processFinal.test.ts` — Added rewrite mock + happy path test
- `package.json` — Version bump to 0.56.0
- `README.md` — Updated Intelligence description
