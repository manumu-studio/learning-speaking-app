# PR — v0.69.0: Transcript Comparison (PACKET-50)

**Branch:** `feat/daily-meta-session`
**Base:** `main`
**Version:** 0.69.0
**Type:** Feature (temporary evaluation)

## Summary

Adds a side-by-side transcript comparison view to the session detail UI, allowing visual evaluation of Whisper (cleaned) vs AssemblyAI (verbatim) transcription quality. Gated behind a feature flag for easy removal after evaluation.

## What was built

- **DivergenceHighlighter** component — color-coded highlighting of divergence spans (insertions, deletions, substitutions)
- **TranscriptComparison** component — two-column layout with word count badges and divergence stats
- **Compare tab** in TranscriptToggle — conditionally rendered when verbatim data exists
- **Feature flag** `NEXT_PUBLIC_SHOW_TRANSCRIPT_COMPARISON` — defaults to `true`, set to `false` to disable
- **12 new tests** covering all new components and integration points

## Architecture

No API changes required — the existing session detail endpoint already returns verbatim scalar fields from the Prisma include. Only the TypeScript `SessionDetail` type needed extending.

The DivergenceHighlighter uses text-search (`indexOf`) rather than character offsets because `DivergenceSpan` stores word indices. It filters spans by side (verbatim shows insertions + substitutions, normalized shows deletions + substitutions).

## Testing

```
188 test files | 1543 passed | 4 skipped | 0 failures
typecheck ✅ | lint ✅ | build ✅
```

## Deployment

1. Merge to main → auto-deploys
2. Verify Compare tab appears on sessions with verbatim data
3. When evaluation is complete, set `NEXT_PUBLIC_SHOW_TRANSCRIPT_COMPARISON=false` or follow the removal checklist

## Removal

See `docs/removal/PACKET-50-removal-checklist.md` for the complete teardown plan.
