# ENTRY-40 — Recording UX Improvements
**Date:** 2026-05-27
**Type:** Feature
**Branch:** `feat/recording-ux-improvements`
**Version:** `0.36.0`
---
## What I Did
- Extended recording time limits to 1 min / 2 min / 5 min / Free (replacing 30s / 1 min / 2 min / Unlimited)
- Added a floating processing toast so users stay on the recording page after submit and can start a new session immediately
- Built silence auto-pause: timer freezes after 15 seconds of silence, resumes when the user speaks again — audio keeps recording throughout

## Files Touched
| File | Action | Notes |
|------|--------|-------|
| `src/features/recording/TimeLimitSelector/` | Modified | New limit options |
| `src/features/session/ProcessingSessionsContext/` | Created | Background session tracking |
| `src/components/ui/ProcessingToast/` | Created | Floating pill + modal |
| `src/components/ui/AppProviders/` | Created | Global provider wrapper |
| `src/app/(app)/layout.tsx` | Modified | AppProviders integration |
| `src/features/recording/RecordingPanel/RecordingPanel.tsx` | Modified | Upload flow + silence UI |
| `src/features/recording/useSilenceDetector.ts` | Created | Web Audio RMS detection |
| `src/features/recording/useAudioRecorder.ts` | Modified | Pause-aware timer |
| Test files (2) | Modified | TimeLimitSelector + RecordingPanel |

## Decisions
- Background toast uses 3s polling instead of WebSockets — simpler, no new infra
- Silence pause is timer-only; trimming silence would add complexity and Whisper handles it fine
- After submit, user resets to idle on the same page — processing tracked globally via context
- Old 30s localStorage values fail Zod parse and fall back to no selection — no migration needed

## Still Open
- Manual testing on real devices for silence threshold in noisy environments
- Monitor Vercel function duration with 5-minute recordings post-deploy

## Validation
```
npx tsc --noEmit → exit 0
npm run lint → ✔ No ESLint warnings or errors
npm run test → 357 passed | 4 skipped
npm run build → ✓ Compiled successfully
```
