# ENTRY-41 — L1 Pronunciation Bridge Rules
**Date:** 2026-05-27
**Type:** Feature
**Branch:** `feat/l1-bridge-rules`
**Version:** `0.37.0`
---
## What I Did
- Expanded the L1 Spanish tagger from 12 to 21 interference patterns (8 new detection rules)
- Built a static bridge rules database mapping every tag to articulatory coaching, Spanish anchors, minimal pairs, and practice words
- Wired client-side bridge lookup into PhonemeDetail so learners see "How to improve" coaching below accent pattern chips

## Files Touched
| File | Action | Notes |
|------|--------|-------|
| `src/lib/ai/l1Spanish.types.ts` | Modified | 21-tag union |
| `src/lib/ai/l1Spanish.ts` | Modified | New detection rules |
| `src/lib/ai/bridgeRules.types.ts` | Created | Bridge types |
| `src/lib/ai/bridgeRules.ts` | Created | 21 coaching entries |
| `src/lib/ai/bridgeLookup.ts` | Created | Pure lookup |
| `src/lib/ai/l1Spanish.test.ts` | Modified | +9 tests |
| `src/lib/ai/bridgeLookup.test.ts` | Created | 7 tests |
| `src/components/ui/PhonemeDetail/` | Modified | Coaching UI + hook |
| `package.json` | Modified | `0.37.0` |

## Decisions
- Client-side lookup over API — bridge data is small, static, and deterministic; no network latency
- `satisfies Record<L1Tag, BridgeRule>` ensures every tag has coaching at compile time
- Kept LLM pronunciation tips for session-level coaching; bridge rules handle per-word phoneme coaching
- Deferred `question_intonation` detection until sentence-level prosody is available

## Still Open
- Sentence-level intonation detection for `question_intonation`
- Manual QA on real Azure sessions for heuristic rules (aspiration, stress)

## Validation
```
npx tsc --noEmit → exit 0
npm run lint → ✔ No ESLint warnings or errors
npm run test → 408 passed | 4 skipped
npm run build → ✓ Compiled successfully
```
