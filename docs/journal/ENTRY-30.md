# ENTRY-30 — Pronunciation Assessment Foundation Modules
**Date:** 2026-05-26
**Type:** Feature
**Branch:** `feat/pronunciation-assessment`
**Version:** `v0.30.0-alpha.1`

---

## What I Did

Built three isolated backend modules that form the foundation for real-time pronunciation assessment:

1. **Audio transcoder** (`src/lib/audio/`) — converts WebM/Opus recordings (the browser's native `MediaRecorder` format) to PCM 16kHz mono 16-bit WAV, the exact format required by Azure Speech SDK. Uses a self-contained ffmpeg binary so there's no system dependency.

2. **Azure pronunciation client** (`src/lib/ai/azurePronunciation.ts`) — wraps the Azure Speech SDK's continuous recognition API. Continuous mode is mandatory for recordings over ~15 seconds. Returns per-word phoneme accuracy, NBest phoneme alternatives, prosody metrics, and IPA data. Client-side miscue detection (Insertion/Omission) is computed via `difflib.SequenceMatcher` rather than relying on Azure's built-in miscue flag, which locks the recognizer into strict comparison mode and reduces raw phoneme accuracy.

3. **L1 Spanish interference tagger** (`src/lib/ai/l1Spanish.ts`) — a pure deterministic function that annotates words with interference tags based on Spanish phoneme inventory gaps. No ML, no API calls, 100% unit-testable.

All three modules sit dormant until the next phase wires them into the processing pipeline.

## Files Touched

| File | Action | Notes |
|------|--------|-------|
| `src/lib/env.ts` | Modified | Two optional Azure env vars added to Zod schema |
| `.env.example` | Modified | Azure Speech SDK section added |
| `next.config.ts` | Modified | ffmpeg binary force-included in Vercel tracing for pipeline route |
| `package.json` | Modified | Azure SDK, difflib, ffmpeg-static + type packages added |
| `src/lib/audio/transcode.ts` | Created | `toPcm16kMonoWav(input: Buffer): Promise<Buffer>` |
| `src/lib/audio/index.ts` | Created | Barrel export |
| `src/lib/audio/__fixtures__/sample.webm` | Created | Binary test fixture |
| `src/lib/audio/transcode.test.ts` | Created | 5 unit tests |
| `src/lib/ai/azurePronunciation.types.ts` | Created | PhonemeResult, WordResult, PronunciationResult types |
| `src/lib/ai/azurePronunciation.ts` | Created | Azure client + aggregate scoring logic |
| `src/lib/ai/azurePronunciation.test.ts` | Created | 4 integration tests (skip-if no credentials) |
| `src/lib/ai/l1Spanish.types.ts` | Created | 21-value L1Tag union |
| `src/lib/ai/l1Spanish.ts` | Created | `tagSpanishL1(words)` pure tagger |
| `src/lib/ai/l1Spanish.test.ts` | Created | 17 unit tests |

## Decisions

- **Client-side miscue detection over Azure built-in**: Azure's built-in miscue requires providing reference text at recognition time, which shifts the recognizer into constrained mode and degrades raw phoneme accuracy. Post-processing with `difflib.SequenceMatcher` gives equivalent Insertion/Omission detection with full phoneme accuracy on recognition.

- **Continuous recognition over single-shot**: `recognizeOnceAsync` silently truncates recordings longer than ~15 seconds. All user sessions can exceed this — continuous mode is the only correct choice.

- **Composite score formula weights worst dimension at 40%**: `pronScore = worst * 0.4 + accuracy * 0.15 + fluency * 0.15 + completeness * 0.15 + prosody * 0.15`. This surfaces any single failing dimension instead of masking it behind the mean.

- **L1 tagger as pure function**: All rules are deterministic phoneme comparisons from Azure NBest data. No ML inference needed — this keeps the module fast, offline-capable, and trivially unit-testable.

- **ffmpeg-static over system ffmpeg**: Eliminates system dependency on deployment environments (Vercel, CI). The binary must be force-included in Next.js output tracing since it's not a JS module.

## Still Open

- No wiring into the processing pipeline yet — planned for the pipeline integration phase
- Azure integration test requires real credentials to execute live assertions
- `SdkWordDetail` interface may need updates if Azure changes the JSON response shape in a future SDK version

## Validation

```
npx tsc --noEmit              → 0 errors
npm run lint                  → ✔ No ESLint warnings or errors
npm run test -- transcode     → ✓ 5/5 passed
npm run test -- l1Spanish     → ✓ 17/17 passed
npm run test -- azurePronunciation → ↓ 4/4 skipped (no credentials, correct)
```
