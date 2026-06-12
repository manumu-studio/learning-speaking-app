# PR 0.72.1 — Type Safety Cleanup

**Branch:** fix/type-safety-audit → main
**Version:** 0.72.1
**Date:** 2026-06-12
**Status:** ✅ Ready to merge

## Summary

Removes every unsafe type cast and non-null assertion flagged by a type-safety
sweep — ten violations across ten production files. No behavior changes: all fixes
are type-level replacements that preserve identical runtime semantics.

## What Changed

- **Zod literal schemas** for fluency round fields (`roundNumber`, `targetMinutes`)
  — the schema now enforces domain constraints at parse time, eliminating two
  downstream casts
- **Type guard predicates** for `PromptCategory` validation and filler lexicon
  membership — replaces the anti-pattern of casting the tested value to satisfy
  `.includes()`
- **Nullish fallbacks** (`?? ''`) for `Date.toISOString().split('T')[0]` in two
  pipeline/training files
- **Null guard in onClick callback** in the transcript token map — removes a
  `token.word!` assertion
- **Destructured loop variables** in `filterSpeakerUtterances` — removes
  `words[i]!` assertions
- **Redundant cast removal** in `useTrends.extractErrorMessage` — TypeScript
  already narrows `body` after the `'error' in body` guard
- **`typeof` narrowing** for the decoded `id_token` in the federated sign-out
  route — replaces an `as string | undefined` cast on an `unknown` JWT field

## Files Changed

| File | Action | Notes |
|------|--------|-------|
| `src/features/trends/useTrends.ts` | Modified | Removed redundant `as { error: unknown }` cast |
| `src/lib/analysis/filterSpeakerUtterances.ts` | Modified | Destructured loop vars; removed `!` assertions |
| `src/components/ui/TranscriptToggle/TranscriptToggle.tsx` | Modified | Null guard in onClick callback |
| `src/app/api/auth/federated-signout/route.ts` | Modified | `typeof` narrowing for decoded id_token |
| `src/features/fluency/FluencyComparison/useFluencyComparison.ts` | Modified | Zod literal unions for roundNumber/targetMinutes |
| `src/app/(app)/fluency-training/page.tsx` | Modified | `toRoundNumber` type guard at data boundary |
| `src/features/training/ReadingPractice/ReadingPractice.tsx` | Modified | `?? ''` nullish fallback |
| `src/lib/pipeline/processFinalHelpers.ts` | Modified | `?? ''` nullish fallback |
| `src/features/recording/PromptCard/PromptCard.tsx` | Modified | `isPromptCategory` predicate guard |
| `src/lib/analysis/countVerbatimFillers.ts` | Modified | `isSingleWordFiller` predicate guard |

## Architecture

No structural changes. All fixes are local to their files and do not affect
interfaces, data models, or pipeline behavior.

## Testing

All existing tests pass unchanged. No new tests required — this is a type-level
cleanup with no behavior changes.

## How to Verify

```bash
npm run typecheck   # exits 0
npm run lint        # exits 0
npm run build       # succeeds
npm test -- --run   # 1607 passed, 4 skipped
```
