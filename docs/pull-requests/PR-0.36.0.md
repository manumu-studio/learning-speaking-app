# PR-0.36.0 — Recording UX Improvements
**Branch:** `feat/recording-ux-improvements` → `main`
**Version:** `0.36.0`
**Date:** 2026-05-27
**Status:** ✅ Ready to merge
---
## Summary
- Extended time limits to 1m / 2m / 5m / Free
- Background processing toast lets users submit and immediately record again
- Silence auto-pause freezes the timer after 15s of silence; audio keeps recording

## Files Changed
| File | Action | Notes |
|------|--------|-------|
| `TimeLimitSelector/` | Modified | New options + schema |
| `ProcessingSessionsContext/` | Created | Session tracking context |
| `ProcessingToast/` | Created | Floating indicator + modal |
| `AppProviders/` | Created | Provider wrapper |
| `(app)/layout.tsx` | Modified | Global toast wiring |
| `RecordingPanel.tsx` | Modified | Upload flow + silence banner |
| `useSilenceDetector.ts` | Created | Web Audio silence hook |
| `useAudioRecorder.ts` | Modified | Pause-aware timer |
| Tests (2) | Modified | Updated mocks/wrappers |

## Architecture Decisions
| Decision | Why |
|----------|-----|
| 3s polling for toast status | No WebSocket infra; session API already exists |
| Timer-only silence pause | Preserves full audio for Whisper; simpler than trimming |
| Stay on recording page after submit | Core UX goal — continuous practice flow |
| AppProviders inside ErrorBoundary | Toast visible even if page content throws |

## Testing Checklist
- [ ] Time limits: each option auto-stops at correct duration
- [ ] Old localStorage value (30) falls back gracefully
- [ ] Submit recording → stay on page, toast appears
- [ ] Toast updates through pipeline steps
- [ ] Modal "View Results" navigates correctly
- [ ] Multiple concurrent sessions show +N badge
- [ ] Toast auto-dismisses after completion
- [ ] 15s silence → timer pauses, amber banner shows
- [ ] Resume speaking → timer continues, banner hides
- [ ] Full audio (including silence) uploads correctly

## Deployment Notes
No new env vars or migrations. Monitor Vercel function duration with 5-minute recordings.

## Validation
```
npx tsc --noEmit → exit 0
npm run lint → ✔ No ESLint warnings or errors
npm run test → 357 passed | 4 skipped
npm run build → ✓ Compiled successfully
```
