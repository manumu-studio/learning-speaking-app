# ENTRY-37 — Speaker Isolation (Push-to-Talk, Phase 1)
**Date:** 2026-05-27
**Type:** Feature
**Branch:** `feat/speaker-isolation`
**Version:** `0.33.0`
---
## What I Did
- Replaced ad-hoc recording state with a discriminated union state machine (`idle → recording → validating → stopped`)
- Added pre-upload validation gates for duration (2–120 s), blob size (500 B–25 MB), and supported MIME types
- Built a real-time `AudioLevelMeter` using Web Audio `AnalyserNode` with clipping and too-quiet warnings
- Added push-to-talk mode (`hold-to-record`) alongside backward-compatible press-to-toggle
- Integrated Silero VAD pre-flight via `@ricky0123/vad-web` with lazy ONNX model loading from `/public/vad/`
- Wired validation + VAD into `RecordingPanel` before upload is offered

## Files Touched
| File | Action | Notes |
|------|--------|-------|
| `src/features/recording/recordingState.types.ts` | Created | Discriminated union types |
| `src/features/recording/recordingStateMachine.ts` | Created | Pure reducer |
| `src/features/recording/validateRecording.ts` | Created | Pre-upload gates |
| `src/features/recording/useSileroVad.ts` | Created | Lazy VAD pre-flight hook |
| `src/features/recording/useAudioRecorder.ts` | Modified | State machine + stream exposure |
| `src/features/recording/RecordingPanel/RecordingPanel.tsx` | Modified | Full wiring |
| `src/components/ui/AudioLevelMeter/` | Created | 4-file component |
| `src/components/ui/RecordButton/RecordButton.tsx` | Modified | Hold-to-record + validating UI |
| `public/vad/silero_vad_legacy.onnx` | Created | Bundled VAD model |
| `package.json` | Modified | `@ricky0123/vad-web`, `onnxruntime-web` |
| Test files (6) | Created/Modified | State machine, validation, VAD, recorder |

## Decisions
- Phase 1 stays client-only — no backend routes or Prisma changes; zero infra cost
- VAD model served from `/public/vad/` to avoid CDN CSP changes and keep loads same-origin
- Background-voice detection uses fragmented-segment heuristics (Silero VAD detects speech, not speaker identity)
- `validating` state blocks upload until gates pass — user sees clear messages instead of failed API calls
- Hold-to-record uses pointer events with `touch-none` for deliberate mobile capture

## Still Open
- Manual validation on real devices (iOS Safari pointer/touch, ONNX WASM load time)
- Phase 2: ECAPA-TDNN enrollment + server-side personal VAD on Modal
- DrillView still uses basic recorder hook — speaker isolation not yet wired to drills

## Validation
```
npx tsc --noEmit → exit 0
npm run lint → ✔ No ESLint warnings or errors
npm run test → 303 passed | 4 skipped
npm run build → ✓ Compiled successfully (onnxruntime-web webpack warnings only)
```
