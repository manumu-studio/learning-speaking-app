# PR-0.37.0 — L1 Pronunciation Bridge Rules
**Branch:** `feat/l1-bridge-rules` → `main`
**Version:** `0.37.0`
**Date:** 2026-05-27
**Status:** ✅ Ready to merge
---
## Summary
- Completes the 21-tag L1 Spanish interference set with 8 new phoneme-level detection rules
- Adds a static bridge rules database with articulatory coaching for every tag
- Shows per-word "How to improve" coaching in PhonemeDetail via instant client-side lookup

## Files Changed
| File | Action | Notes |
|------|--------|-------|
| `src/lib/ai/l1Spanish.types.ts` | Modified | 21-tag union |
| `src/lib/ai/l1Spanish.ts` | Modified | Detection rules |
| `src/lib/ai/bridgeRules.ts` | Created | Coaching data |
| `src/lib/ai/bridgeRules.types.ts` | Created | Types |
| `src/lib/ai/bridgeLookup.ts` | Created | Lookup function |
| `src/lib/ai/l1Spanish.test.ts` | Modified | +9 tests |
| `src/lib/ai/bridgeLookup.test.ts` | Created | 7 tests |
| `src/components/ui/PhonemeDetail/` | Modified | UI + hook |
| `package.json` | Modified | `0.37.0` |

## Architecture Decisions
| Decision | Why |
|----------|-----|
| Client-side `getBridgeRules` | Zero latency, zero cost, deterministic, works offline |
| `satisfies Record<L1Tag, BridgeRule>` | Compile-time guard that all tags have coaching |
| Heuristic aspiration/stress rules | Azure cannot distinguish aspiration directly; coaching still valuable |
| Defer `question_intonation` detection | Requires sentence-level prosody not available per-word |

## Testing Checklist
- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes
- [x] `npm run test` passes (408 tests)
- [x] `npm run build` passes
- [ ] Session with L1 tags shows bridge coaching in PhonemeDetail (manual)
- [ ] Word without L1 tags shows no "How to improve" section (manual)
- [ ] Existing 12 L1 rules still tag correctly on real sessions (manual)

## Deployment Notes
No schema changes. No new env vars. Pure additive frontend + tagger logic.

## Validation
```
npx tsc --noEmit → exit 0
npm run lint → ✔ No ESLint warnings or errors
npm run test → 408 passed | 4 skipped
npm run build → ✓ Compiled successfully
```
