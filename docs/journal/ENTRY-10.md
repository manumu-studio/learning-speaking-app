# ENTRY-10 — Pipeline Pronunciation Integration
**Date:** 2026-05-26
**Type:** Feature
**Branch:** `feat/pipeline-integration`
**Version:** `v0.30.0-alpha.2`

---

## What I Did

Wired the Azure Speech pronunciation assessment into the main session processing pipeline. Previously the pipeline ran: download audio → transcribe → Claude analysis → done. Now it runs: download audio → transcode to PCM → transcribe → score pronunciation → Claude analysis → done, with graceful fallback when Azure is unavailable.

Added two new database tables to store the results: `pronunciation_reports` (aggregate session scores) and `word_pronunciations` (one row per word with phoneme detail and L1 Spanish interference tags). Added a `SCORING` pipeline status so users see the right step in the processing UI.

Expanded the metric system from 6 to 9 keys. The three new metrics (`pronunciationAccuracy`, `prosodyScore`, `speakingRate`) are computed from Azure data — not scored by Claude — and stored before Claude runs.

## Files Touched
| File | Action | Notes |
|------|--------|-------|
| `prisma/schema.prisma` | Modified | New models, SCORING enum, SpeakingSession relation |
| `src/lib/pipeline/executePipeline.ts` | Modified | Full pipeline restructure with Azure step |
| `src/lib/pipeline/persistPronunciation.ts` | Created | Atomic DB writes for pronunciation data |
| `src/lib/ai/analyze.ts` | Modified | Optional pronunciation context passed to Claude |
| `src/lib/metric-keys.ts` | Modified | 9 metric keys (was 6) |
| `src/features/session/useSessionStatus.ts` | Modified | SCORING status + pronunciationReport Zod schema |
| `src/features/session/useSessionStatus.types.ts` | Modified | PronunciationReportDetail types |
| `src/features/dashboard/dashboard.types.ts` | Modified | 3 new MetricKey literals |
| `src/features/dashboard/getDashboardData.ts` | Modified | 9-key metric system |
| `src/features/dashboard/DashboardView/useDashboard.ts` | Modified | Updated Zod schema |
| `src/app/(app)/session/[id]/page.tsx` | Modified | Labels + drill map for 3 new keys |
| `src/app/api/sessions/[id]/route.ts` | Modified | pronunciationReport included in response |
| `src/components/ui/ProcessingStatus/ProcessingStatus.tsx` | Modified | SCORING step in UI |
| `src/components/ui/ProcessingStatus/ProcessingStatus.types.ts` | Modified | SCORING in status union |
| `src/features/recording/useAudioRecorder.ts` | Modified | 16kHz mono, NS/EC/AGC disabled |
| Training components (7 files) | Modified | Added 'pronunciation' DrillType across drill system |

## Decisions
- **R2 deletion moved to `finally`**: Azure needs the PCM buffer. Moving cleanup to `finally` guarantees audio is deleted even when Azure or Claude throws.
- **Azure failures are non-blocking**: A failed Azure call is caught, logged, and the pipeline continues. Users still get their Claude analysis.
- **Pronunciation metrics not scored by Claude**: Azure scores these with higher precision than LLM estimation. Claude's system prompt explicitly excludes them.
- **Score mapping is intelligibility-first**: The 0-100→1-10 curve is lenient at the low end — accented speech is not penalized the same way as genuinely unclear speech.
- **Recording constraints changed**: NS/EC/AGC disabled because they attenuate the fricatives (`/s/`, `/ʃ/`, `/θ/`) that Azure's phoneme scoring depends on.

## Still Open
- No UI for pronunciation results yet (future packet)
- Dashboard charts don't show the 3 new metrics separately (future packet)
- `azureSdkVersion` is a hard-coded constant — needs manual update on SDK upgrade

## Validation
```
npx prisma migrate dev → Clean migration applied
npx tsc --noEmit → 0 errors
npm run lint → No ESLint warnings or errors
npm run test → 250 passed | 4 skipped
```
