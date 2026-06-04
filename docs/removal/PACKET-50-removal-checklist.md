# PACKET-50 Removal Checklist — Transcript Comparison

**Status:** ACTIVE (temporary evaluation feature)
**Added:** 2026-06-04 (v0.69.0)
**Expected removal:** ~1 week after deployment

## Quick disable (no code change)

Set `NEXT_PUBLIC_SHOW_TRANSCRIPT_COMPARISON=false` in Vercel env vars and redeploy.

## Full removal checklist

### Components to delete
- [ ] `src/components/ui/DivergenceHighlighter/` (entire folder)
- [ ] `src/features/session/TranscriptComparison/` (entire folder)

### Files to revert
- [ ] `src/components/ui/TranscriptToggle/TranscriptToggle.tsx` — remove `TranscriptComparison` import, remove Compare view branch, remove `comparisonEnabled` / `hasVerbatim` logic, inline `VocabUpgradeFooter` back if desired
- [ ] `src/components/ui/TranscriptToggle/TranscriptToggle.types.ts` — remove `verbatimText`, `verbatimWordCount`, `divergenceSpans`, `verbatimProvider` props and `DivergenceSpan` import
- [ ] `src/components/ui/TranscriptToggle/useTranscriptToggle.ts` — remove `'compare'` from `TranscriptView` union
- [ ] `src/components/ui/TranscriptToggle/TranscriptToggle.test.tsx` — remove 3 Compare tab tests
- [ ] `src/features/session/useSessionStatus.types.ts` — remove 4 verbatim fields from `SessionDetail` and `DivergenceSpan` import
- [ ] `src/app/(app)/session/[id]/SessionFeedbackSections.tsx` — remove 4 verbatim props from TranscriptToggle call in TranscriptSection

### Env and config
- [ ] `src/lib/env.ts` — remove `NEXT_PUBLIC_SHOW_TRANSCRIPT_COMPARISON`
- [ ] `.env.example` — remove feature flag section
- [ ] Vercel dashboard — delete env var

### Docs
- [ ] Remove this checklist file
- [ ] Add removal note to CHANGELOG.md

### Verify after removal
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] `npm test` passes
- [ ] TranscriptToggle still shows Pronunciation map / Your words / Improved tabs correctly
