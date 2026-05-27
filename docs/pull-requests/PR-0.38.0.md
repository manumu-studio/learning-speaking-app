# PR-0.38.0 — IPA Phoneme Display + Bug Fixes
**Branch:** `feat/ipa-phoneme-display` → `main`
**Version:** `0.38.0`
**Date:** 2026-05-27
**Status:** ✅ Ready to merge
---
## Summary
- Adds SAPI→IPA phoneme display with a localStorage-persisted toggle (defaults to IPA)
- Shows full word IPA transcription in PhonemeDetail header
- Fixes speaking rate float display and hides spurious "Break error: None" in prosody feedback

## Files Changed
| File | Action | Notes |
|------|--------|-------|
| `src/lib/pronunciation/sapiToIpa.ts` | Created | Mapping table |
| `src/lib/pronunciation/sapiToIpa.test.ts` | Created | 9 tests |
| `src/hooks/usePhonemeAlphabet.ts` | Created | IPA/SAPI hook |
| `src/components/ui/PhonemeDetail/PhonemeDetail.tsx` | Modified | Toggle + header |
| `src/components/ui/ProsodyPanel/ProsodyPanel.tsx` | Modified | Rate rounding |
| `package.json` | Modified | `0.38.0` |

## Architecture Decisions
| Decision | Why |
|----------|-----|
| Client-side mapping table | Zero latency, no API cost, works offline |
| Default IPA | Standard for language learners |
| Phoneme concatenation for word IPA | Azure already sends phoneme array; no dict needed |

## Testing Checklist
- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes
- [x] `npm run test -- src/lib/pronunciation/sapiToIpa.test.ts` passes
- [x] `npm run build` passes
- [ ] PhonemeDetail shows IPA symbols by default (manual)
- [ ] Toggle switches to SAPI and persists on reload (manual)
- [ ] Speaking rate shows integer wpm (manual)
- [ ] "Break error: None" no longer visible (manual)

## Deployment Notes
No schema changes. No new env vars. Pure client-side UI enhancement.

## Validation
```
npx tsc --noEmit → exit 0
npm run lint → ✔ No ESLint warnings or errors
npm run test -- src/lib/pronunciation/sapiToIpa.test.ts → 9 passed
npm run build → ✓ Compiled successfully
```
