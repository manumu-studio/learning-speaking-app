# PR-0.35.0 — Recording UX & Flow
**Branch:** `feat/recording-ux` → `main`
**Version:** `0.35.0`
**Date:** 2026-05-27
**Status:** ✅ Ready to merge
---
## Summary
- Turns the record screen into a guided flow: prompts, time limits, live waveform, preview-before-submit, and session context
- Mobile-friendly polish: screen stays awake during recording, haptic feedback on start/stop, clean stop when the mic is interrupted
- Upload and analysis pipeline unchanged — all work is in the recording UI layer

## Files Changed
| File | Action | Notes |
|------|--------|-------|
| `src/features/recording/WaveformVisualizer/` | Created | Real-time frequency bars |
| `src/features/recording/prompts.config.ts` | Created | Curated prompts |
| `src/features/recording/PromptCard/` | Created | Category + shuffle UI |
| `src/features/recording/TimeLimitSelector/` | Created | Persisted limit picker |
| `src/features/recording/AudioPreviewPanel/` | Created | Submit / retry / discard |
| `src/features/recording/RecordingContext/` | Created | Today’s recording count |
| `src/features/recording/useMobileRecording.ts` | Created | Wake lock + haptics + interruption |
| `src/features/recording/RecordingPanel/RecordingPanel.tsx` | Modified | Orchestrates new UX |
| `src/features/recording/useAudioRecorder.ts` | Modified | Auto-stop at limit |
| `src/components/ui/SessionTimer/` | Modified | Amber countdown |
| Tests (6 files) | Created | New component coverage |

## Architecture Decisions
| Decision | Why |
|----------|-----|
| Static prompt config | Zero latency, no backend work for v1 |
| `timeLimitSecs` on existing recorder hook | Reuses one timer interval; no duplicate clocks |
| `useMobileRecording` wrapper handlers | Keeps wake lock / vibration out of the core state machine |
| Preview panel owns post-stop actions | Removes duplicated buttons and `<audio>` markup from the panel |
| Reuse sessions API for context | Same Zod shape as history; limit=10 keeps the call light |

## Testing Checklist
- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes
- [x] `npm run test` passes (355 tests)
- [x] `npm run build` succeeds
- [ ] Waveform animates during recording on Chrome/Safari (manual)
- [ ] Time limit auto-stops at 30s / 60s / 120s (manual)
- [ ] Discard returns to dashboard without upload (manual)
- [ ] Wake lock holds screen during recording on mobile (manual)

## Deployment Notes
- No migrations, env vars, or infrastructure changes
- No new npm dependencies

## Validation
```
npx tsc --noEmit → exit 0
npm run lint → ✔ No ESLint warnings or errors
npm run test → 355 passed | 4 skipped
npm run build → ✓ Compiled successfully
```
