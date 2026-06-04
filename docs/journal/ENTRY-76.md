# Entry 76 — 2026-06-04 — Transcript Comparison (PACKET-50)

**Type:** Feature (temporary evaluation)
**Branch:** `feat/daily-meta-session`
**Version:** 0.69.0

## Summary

Added a side-by-side transcript comparison view so we can visually evaluate Whisper (cleaned) vs AssemblyAI (verbatim) transcription quality. This is a temporary feature for evaluating dual-ASR quality before deciding which transcription pipeline to keep long-term.

## What was built

1. **DivergenceHighlighter** — Generic component that renders transcript text with color-coded `<mark>` spans for divergence types: insertions (blue), deletions (red), substitutions (amber). Works for both sides (verbatim/normalized) by filtering relevant spans.

2. **TranscriptComparison** — Two-column layout (stacked on mobile) showing Whisper and verbatim transcripts side-by-side. Includes column headers with word count badges and a stats row showing word count difference and divergence count.

3. **Compare tab in TranscriptToggle** — New "Compare" tab appears only when the session has verbatim data. Clicking it swaps the standard transcript panel for the TranscriptComparison view.

4. **Feature flag** — `NEXT_PUBLIC_SHOW_TRANSCRIPT_COMPARISON` env var (default `true`) gates the Compare tab. Set to `false` to hide without code changes.

5. **Type updates** — Extended `SessionDetail` with verbatim fields, extended `TranscriptToggleProps` with optional verbatim props, added `'compare'` to `TranscriptView` union.

## Files created
- `src/components/ui/DivergenceHighlighter/DivergenceHighlighter.tsx`
- `src/components/ui/DivergenceHighlighter/DivergenceHighlighter.types.ts`
- `src/components/ui/DivergenceHighlighter/index.ts`
- `src/components/ui/DivergenceHighlighter/DivergenceHighlighter.test.tsx`
- `src/features/session/TranscriptComparison/TranscriptComparison.tsx`
- `src/features/session/TranscriptComparison/TranscriptComparison.types.ts`
- `src/features/session/TranscriptComparison/index.ts`
- `src/features/session/TranscriptComparison/TranscriptComparison.test.tsx`
- `docs/removal/PACKET-50-removal-checklist.md`

## Files modified
- `src/features/session/useSessionStatus.types.ts` — 4 optional verbatim fields on SessionDetail
- `src/components/ui/TranscriptToggle/useTranscriptToggle.ts` — added `'compare'` to TranscriptView union
- `src/components/ui/TranscriptToggle/TranscriptToggle.types.ts` — 4 optional verbatim props
- `src/components/ui/TranscriptToggle/TranscriptToggle.tsx` — Compare tab + VocabUpgradeFooter extraction (complexity fix)
- `src/components/ui/TranscriptToggle/TranscriptToggle.test.tsx` — 3 new Compare tab tests
- `src/app/(app)/session/[id]/SessionFeedbackSections.tsx` — wired verbatim props through TranscriptSection
- `src/lib/env.ts` — NEXT_PUBLIC_SHOW_TRANSCRIPT_COMPARISON env var
- `.env.example` — feature flag documentation
- `package.json` — 0.68.0 → 0.69.0
- `CHANGELOG.md` — 0.69.0 entry

## Key decisions
- **No API route changes needed** — Prisma `include` already returns all scalar fields; only TypeScript types needed updating
- **Text-search for highlighting** — DivergenceSpan uses word indices, not character offsets, so we use `indexOf` to locate span text in the transcript
- **Extracted VocabUpgradeFooter** — ESLint complexity hit 16/15 after adding Compare logic; extracting the footer component fixed it cleanly
- **Feature flag defaults to `true`** — temporary feature, opt-out rather than opt-in

## Testing
- 14 passing tests across 3 files (4 DivergenceHighlighter + 5 TranscriptComparison + 5 TranscriptToggle)
- Full suite: 188 files, 1543 tests passing, 0 failures
- Quality gates: typecheck ✅, lint ✅, build ✅
