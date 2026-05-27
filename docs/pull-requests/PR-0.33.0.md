# PR-0.33.0 — Speaker Isolation (Push-to-Talk, Phase 1)
**Branch:** `feat/speaker-isolation` → `main`
**Version:** `0.33.0`
**Date:** 2026-05-27
**Status:** ✅ Ready to merge
---
## Summary
- Prevents background voices and accidental captures from reaching Whisper/Claude via push-to-talk, VAD pre-flight, and pre-upload validation
- Recording lifecycle uses a typed state machine with a new `validating` phase before upload is offered
- Real-time audio level meter warns on clipping or too-quiet input during recording

## Files Changed
| File | Action | Notes |
|------|--------|-------|
| `src/features/recording/recordingState.types.ts` | Created | Discriminated union |
| `src/features/recording/recordingStateMachine.ts` | Created | Pure reducer |
| `src/features/recording/validateRecording.ts` | Created | Duration/size/MIME gates |
| `src/features/recording/useSileroVad.ts` | Created | Lazy Silero VAD hook |
| `src/features/recording/useAudioRecorder.ts` | Modified | State machine integration |
| `src/features/recording/RecordingPanel/RecordingPanel.tsx` | Modified | VAD + validation wiring |
| `src/components/ui/AudioLevelMeter/` | Created | AnalyserNode meter |
| `src/components/ui/RecordButton/` | Modified | Hold-to-record mode |
| `public/vad/silero_vad_legacy.onnx` | Created | VAD model asset |
| `package.json` | Modified | VAD dependencies |

## Architecture Decisions
| Decision | Why |
|----------|-----|
| Client-only Phase 1 | Zero infra cost; covers 60–75% of bystander problem per research |
| Lazy dynamic import for VAD | 1.4 MB ONNX model must not block initial page render |
| Model in `/public/vad/` | Same-origin serving avoids CSP changes |
| Fragmented-segment heuristic for background voices | Silero VAD detects speech presence, not speaker identity |
| `validating` state before `stopped` | Gates run before upload UI appears |

## Testing Checklist
- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes
- [x] `npm run test` passes (303 tests)
- [x] `npm run build` succeeds
- [ ] Hold-to-record works on mobile (manual)
- [ ] Press-to-toggle backward compatible (manual)
- [ ] "No speech detected" shown for silent recording (manual)
- [ ] Background voice warning with proceed option (manual)
- [ ] Recordings < 2 s rejected with clear message (manual)
- [ ] Level meter shows during recording (manual)

## Deployment Notes
- New static asset: `public/vad/silero_vad_legacy.onnx` (~1.4 MB) — ensure it deploys with the app
- No schema migrations or env var changes
- Webpack may warn on `onnxruntime-web` dynamic requires — expected, build succeeds

## Validation
```
npx tsc --noEmit → exit 0
npm run lint → ✔ No ESLint warnings or errors
npm run test → 303 passed | 4 skipped
npm run build → ✓ Compiled successfully
```
