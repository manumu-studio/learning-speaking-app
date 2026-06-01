# PR-0.56.0 — Vocabulary-Enhanced Transcripts
**Branch:** `feat/intelligence-features` → `main`
**Version:** `0.56.0`
**Date:** 2026-06-01
**Status:** Ready to merge
---
## Summary
After each session, Claude generates a rewritten version of the user's transcript that naturally incorporates the 2-3 vocabulary words it suggested during analysis. Users toggle between their original words and the improved version on the results page, with upgraded vocabulary bolded.

## Files Changed
| File | Action | Notes |
|------|--------|-------|
| `prisma/schema.prisma` | Modified | `improvedText` + `wordsUsed` on Transcript model |
| `prisma/migrations/20260601074228_add_improved_transcript/` | Created | Nullable text column + string array with default |
| `src/lib/ai/rewriteTranscript.ts` | Created | Claude Haiku rewrites transcript with vocab suggestions |
| `src/lib/ai/rewriteTranscript.test.ts` | Created | 10 tests — short text skip, code fences, invalid JSON, API errors |
| `src/components/ui/TranscriptToggle/` | Created | 4-file component — "Your words" / "Improved" toggle with word highlighting |
| `src/lib/pipeline/processFinal.ts` | Modified | Wired rewriteTranscript after vocab persist |
| `src/lib/pipeline/__tests__/processFinal.test.ts` | Modified | Added rewrite mock + vocab→rewrite happy path test |
| `src/features/session/useSessionStatus.ts` | Modified | Updated Zod schema with improvedText + wordsUsed |
| `src/features/session/useSessionStatus.types.ts` | Modified | Updated transcript type |
| `src/app/(app)/session/[id]/page.tsx` | Modified | Wired TranscriptToggle with fallback to AnnotatedTranscript |
| `src/app/(app)/session/[id]/page.test.tsx` | Modified | Updated transcript mock with new fields |
| `src/app/api/internal/backfill-improved-transcripts/route.ts` | Created | Auth-protected endpoint to backfill existing sessions |
| `scripts/backfill-improved-transcripts.ts` | Created | Standalone script for backfilling improved transcripts |
| `package.json` | Modified | Version bump to 0.56.0 |
| `README.md` | Modified | Updated Intelligence feature description |

## Architecture Decisions
| Decision | Why |
|----------|-----|
| Light upgrade, not a full rewrite | Preserves speaker's meaning and tone — only word choice changes |
| Skip rewrite if < 20 words or no vocab suggestions | Too little context for a meaningful upgrade |
| Client-side word highlighting via regex | Simpler and more reliable than having Claude mark words in the text |
| Sequential pipeline only (not parallel) | `processParallelFinal` uses `synthesizeAnalysis` which doesn't produce vocab suggestions — toggle hidden for those sessions |
| `@default([])` on wordsUsed | Ensures existing transcript rows get empty array, not null |

## Testing Checklist
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes
- [ ] `npm run lint` — 0 new warnings
- [ ] `npm test` — 913+ passing, 0 failing
- [ ] Record session > 2 min → results page shows "Your words" / "Improved" toggle
- [ ] Toggle to "Improved" → vocab words appear bolded in sky-blue
- [ ] Short session (< 20 words) → no toggle, shows AnnotatedTranscript
- [ ] Session without vocab suggestions → no toggle
- [ ] Old sessions without improvedText → no toggle (graceful)

## Deployment Notes
- **Migration already applied:** `20260601074228_add_improved_transcript` adds nullable `improvedText` and `wordsUsed TEXT[]` — safe, no downtime
- No new environment variables
- No breaking changes to existing features
