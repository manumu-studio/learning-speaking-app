# PR-0.50.0 — Recording UX + Prosody UI
**Branch:** `feat/recording-ux-prosody-ui` → `main`
**Version:** `0.50.0`
**Date:** 2026-05-31
**Status:** ✅ Ready to merge
---
## Summary
Short recordings now use a fast upload path without chunked session overhead. Onboarding and drills record via AudioWorklet only — MediaRecorder is fully removed. Session results progressively reveal transcript, pronunciation, insights, and pitch data as processing completes. Prosody feedback surfaces Azure word-level intonation and pause errors.

## Files Changed
| File | Action | Notes |
|------|--------|-------|
| `useChunkUploader.ts` | Modified | Single-chunk fast path via FormData |
| `OnboardingRecorder.tsx` | Modified | AudioWorklet migration |
| `OnboardingGuard/` | Created | Fixes CSR redirect loop |
| `ProsodyFeedback/` | Created | Word-level prosody UI |
| `ProcessingStatus/` | Modified | Progressive disclosure checklist |
| `session/[id]/page.tsx` | Modified | Partial results while processing |
| `getDashboardData.ts` | Modified | Pitch sparkline for prosody card |
| `useAudioRecorder*`, `useSegmentUploader*` | Deleted | MediaRecorder removed |

## Architecture Decisions
| Decision | Why |
|----------|-----|
| Fast path at chunk-ready | Avoids creating `isChunked` sessions for ≤2 min recordings |
| Client OnboardingGuard | `headers().get('x-pathname')` is stale during CSR |
| ProsodyFeedback + ProsodyPanel | Word-level vs session-level prosody views |

## Testing Checklist
- [ ] Record a 30s session — verify fast path (no chunked flow, immediate processing)
- [ ] Record a 3+ min session — verify chunked upload still works
- [ ] Complete onboarding — no redirect loop after voice profile
- [ ] View session results during processing — transcript/scores appear progressively
- [ ] Dashboard prosody card shows pitch preview when contour data exists

## Deployment Notes
No new env vars. No migrations.

## Validation
```
npx tsc --noEmit → exit 0
npm run build → ✓
npm run lint → ✔
npm test -- --run → 669 passed, 4 skipped
rg "MediaRecorder" src/ → 0 results
```
