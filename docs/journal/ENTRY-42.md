# ENTRY-42 — IPA Phoneme Display + Bug Fixes
**Date:** 2026-05-27
**Type:** Feature
**Branch:** `feat/ipa-phoneme-display`
**Version:** `0.38.0`
---
## What I Did
- Added a static SAPI→IPA mapping table so Azure phoneme codes render as standard IPA symbols
- Built a localStorage-persisted IPA/SAPI toggle in PhonemeDetail (defaults to IPA)
- Showed full word IPA transcription in the phoneme modal header
- Fixed speaking rate displaying as a raw float in ProsodyPanel
- Hid "Break error: None" when Azure returns no actual break errors

## Files Touched
| File | Action | Notes |
|------|--------|-------|
| `src/lib/pronunciation/sapiToIpa.ts` | Created | 40-entry mapping |
| `src/lib/pronunciation/sapiToIpa.test.ts` | Created | Unit tests |
| `src/hooks/usePhonemeAlphabet.ts` | Created | Preference hook |
| `src/components/ui/PhonemeDetail/PhonemeDetail.tsx` | Modified | Toggle + IPA header |
| `src/components/ui/ProsodyPanel/ProsodyPanel.tsx` | Modified | Math.round fix |
| `package.json` | Modified | `0.38.0` |

## Decisions
- Client-side lookup only — ~1 KB static table, zero latency, mirrors bridge rules pattern
- Default to IPA — SAPI is an internal Microsoft convention; learners expect IPA
- Word IPA from phoneme concatenation — no CMU dict lookup; stress markers deferred

## Still Open
- Stress markers in word IPA would need a pronunciation dictionary (future packet)
- Manual verification on live session with phoneme data

## Validation
```
npx tsc --noEmit → exit 0
npm run lint → ✔ No ESLint warnings or errors
npm run test -- src/lib/pronunciation/sapiToIpa.test.ts → 9 passed
npm run build → ✓ Compiled successfully
```
