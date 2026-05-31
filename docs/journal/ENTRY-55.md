# ENTRY-55 — Recording UX + Prosody UI
**Date:** 2026-05-31
**Type:** Feature
**Branch:** `feat/recording-ux-prosody-ui`
**Version:** `0.50.0`
---
## What I Did
- Added a two-tier upload path: short recordings (≤2 min, single chunk) use the fast FormData flow; longer sessions keep the chunked R2 pipeline
- Migrated onboarding and drill recording to AudioWorklet and removed all MediaRecorder code
- Fixed onboarding redirect loops by moving the guard to a client component with `usePathname()`
- Built per-word prosody feedback and progressive results disclosure during processing
- Added a pitch contour mini-preview on the dashboard prosody metric card

## Files Touched
| File | Action | Notes |
|------|--------|-------|
| `src/features/recording/useChunkUploader.ts` | Modified | Fast path for single-chunk sessions |
| `src/features/onboarding/OnboardingRecorder/` | Modified | AudioWorklet + WAV validation |
| `src/components/ui/OnboardingGuard/` | Created | Client-side onboarding redirect |
| `src/components/ui/ProsodyFeedback/` | Created | Per-word prosody indicators |
| `src/app/(app)/session/[id]/page.tsx` | Modified | Progressive processing UX |
| `src/features/dashboard/getDashboardData.ts` | Modified | Pitch preview for prosody card |
| `useAudioRecorder.ts`, `useSegmentUploader.ts` | Deleted | MediaRecorder fully removed |

## Decisions
- Fast path decision at chunk upload time (`isFinal && chunkIndex === 0`) avoids pre-creating chunked sessions for short recordings
- Kept ProsodyPanel for session-level rhythm summary; ProsodyFeedback adds word-level indicators
- Version bumped to 0.50.0 (0.49.0 already used for pitch visualization)

## Still Open
None

## Validation
```
npx tsc --noEmit → exit 0
npm run build → ✓
npm run lint → ✔
npm test -- --run → 669 passed
```
