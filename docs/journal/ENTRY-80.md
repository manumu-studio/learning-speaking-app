# Entry 80

**Date:** 2026-06-12
**Type:** Quality fix
**Branch:** fix/type-safety-audit
**Version:** 0.72.1

## Summary

Removed every unsafe type cast and non-null assertion flagged by a type-safety
sweep — ten violations across ten production files. Each was replaced with a
type-safe equivalent (Zod literal schemas, predicate type guards, destructured
null checks, and nullish fallbacks) with no change to runtime behavior.

## Key Decisions

- **Zod literal unions over `z.number()` for constrained domains:** `roundNumber`
  and `targetMinutes` are domain-constrained values (1/2/3 and 4/3/2). Using
  `z.union([z.literal(1), ...])` makes Zod enforce the constraint at parse time,
  which eliminates the downstream casts and produces better error messages if the
  API ever drifts.

- **Predicate guards over array casts for `.includes()` broadening:** Two files
  cast a `string` to a tuple member type just to satisfy `.includes()`. The
  correct pattern is a predicate (`(value: string): value is TupleType`) that
  widens the **array** (`as readonly string[]`), not the value — this is the
  allowlisted boundary pattern in the project's type rules.

- **`?? ''` over `as string` for `split()[0]`:** `Date.toISOString().split('T')[0]`
  is always defined in practice, but `noUncheckedIndexedAccess` types it as
  `string | undefined`. The nullish fallback `?? ''` is honest — it documents the
  theoretically possible undefined case without asserting it away.

- **Guard inside onClick vs render-time guarantee:** the transcript token button
  renders only when `token.word !== null`, but TypeScript types the callback
  independently. An early-return guard inside onClick (`if (token.word === null)
  return`) is the standard pattern for JSX callbacks with render-time guarantees
  TypeScript cannot infer.

- **`typeof` narrowing for the decoded id_token:** the federated sign-out route
  read `decoded?.idToken` (an `unknown` extension field) with an `as string`
  cast. A `typeof rawIdToken === 'string'` check narrows it correctly and falls
  back to `undefined`, so a malformed token degrades to the `client_id` logout
  path instead of forwarding a non-string hint.

## Files Modified

- `src/features/trends/useTrends.ts` — removed redundant `as { error: unknown }` cast
- `src/lib/analysis/filterSpeakerUtterances.ts` — destructured loop variables, replaced `!` assertions
- `src/components/ui/TranscriptToggle/TranscriptToggle.tsx` — null guard in onClick callback
- `src/app/api/auth/federated-signout/route.ts` — `typeof` narrowing for the decoded id_token
- `src/features/fluency/FluencyComparison/useFluencyComparison.ts` — Zod literal union schemas for roundNumber and targetMinutes
- `src/app/(app)/fluency-training/page.tsx` — `toRoundNumber` type guard at the data boundary
- `src/features/training/ReadingPractice/ReadingPractice.tsx` — `?? ''` nullish fallback
- `src/lib/pipeline/processFinalHelpers.ts` — `?? ''` nullish fallback
- `src/features/recording/PromptCard/PromptCard.tsx` — `isPromptCategory` predicate guard
- `src/lib/analysis/countVerbatimFillers.ts` — `isSingleWordFiller` predicate guard

## Still Open

- None. All quality gates pass (typecheck, lint, build, full test suite).

## Validation

```bash
npm run typecheck   # exits 0
npm run lint        # 0 violations on modified files
npm run build       # succeeds
npm test -- --run   # 1607 passed, 4 skipped
```
