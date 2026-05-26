# PR-0.30.0 — Pronunciation Assessment Foundation Layer
**Branch:** `feat/pronunciation-assessment` → `main`
**Version:** `0.30.0`
**Date:** 2026-05-26
**Status:** ✅ Ready to merge

---

## Summary

Introduces three isolated backend modules for pronunciation assessment. No pipeline wiring, no UI changes, no schema migrations — these modules are dormant until the next phase.

- **Audio transcoder**: converts WebM/Opus (browser `MediaRecorder` output) to PCM 16kHz mono WAV via `ffmpeg-static`
- **Azure pronunciation client**: wraps continuous recognition with per-word phoneme accuracy, NBest alternatives, prosody, and client-side miscue detection
- **L1 Spanish tagger**: deterministic rule engine annotating words with interference tags derived from Spanish phoneme inventory gaps

## Files Changed

| File | Action | Notes |
|------|--------|-------|
| `src/lib/env.ts` | Modified | `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` optional env vars |
| `.env.example` | Modified | Azure Speech SDK section |
| `next.config.ts` | Modified | `outputFileTracingIncludes` for ffmpeg binary |
| `package.json` | Modified | 3 prod + 2 dev dependencies |
| `src/lib/audio/transcode.ts` | Created | `toPcm16kMonoWav` function |
| `src/lib/audio/index.ts` | Created | Barrel export |
| `src/lib/audio/__fixtures__/sample.webm` | Created | Binary test fixture (5s silent WebM) |
| `src/lib/audio/transcode.test.ts` | Created | 5 unit tests |
| `src/lib/ai/azurePronunciation.types.ts` | Created | All pronunciation types |
| `src/lib/ai/azurePronunciation.ts` | Created | Azure client + aggregate scoring |
| `src/lib/ai/azurePronunciation.test.ts` | Created | 4 integration tests |
| `src/lib/ai/l1Spanish.types.ts` | Created | L1Tag union (21 values) |
| `src/lib/ai/l1Spanish.ts` | Created | Pure tagger function |
| `src/lib/ai/l1Spanish.test.ts` | Created | 17 unit tests |

## Architecture Decisions

| Decision | Why |
|----------|-----|
| Continuous recognition (not single-shot) | `recognizeOnceAsync` silently truncates at ~15 seconds; all user sessions can exceed this |
| Client-side miscue via difflib | Azure built-in miscue requires reference text at recognition time, which constrains the recognizer and reduces raw phoneme accuracy |
| `worst * 0.4` composite formula | Prevents a single poor dimension from being masked by the mean |
| ffmpeg-static binary in `outputFileTracingIncludes` | Vercel tracing doesn't detect non-JS binaries automatically |
| `SdkWordDetail` local interface | Azure SDK v1.49.0 type declarations omit `Offset`, `Duration`, and `Feedback.Prosody` from `DetailResult.Words` |

## Testing Checklist

- [x] `npx tsc --noEmit` — zero errors
- [x] `npm run lint` — zero warnings
- [x] `npm run test -- transcode` — 5/5 pass
- [x] `npm run test -- l1Spanish` — 17/17 pass
- [x] `npm run test -- azurePronunciation` — skips gracefully without `AZURE_SPEECH_KEY`
- [ ] Azure live integration test — requires `AZURE_SPEECH_KEY` in `.env.local`

## Deployment Notes

- Add `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION` to Vercel environment variables before activating the pronunciation pipeline
- The ffmpeg binary is automatically included in the Vercel bundle via `outputFileTracingIncludes`
- No database migrations required

## Validation

```
npx tsc --noEmit              → exit 0
npm run lint                  → ✔ No ESLint warnings or errors
npm run test -- transcode     → ✓ 5/5 passed
npm run test -- l1Spanish     → ✓ 17/17 passed
npm run test -- azurePronunciation → ↓ 4 skipped (correct — no credentials)
```
