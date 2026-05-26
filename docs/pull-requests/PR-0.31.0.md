# PR-0.30.0-alpha.2 — Pipeline Pronunciation Integration
**Branch:** `feat/pipeline-integration` → `main`
**Version:** `v0.30.0-alpha.2`
**Date:** 2026-05-26
**Status:** ✅ Ready to merge

---

## Summary
- Integrates Azure pronunciation assessment into the processing pipeline as a non-blocking step between transcription and Claude analysis
- Adds `pronunciation_reports` and `word_pronunciations` database tables with full phoneme and L1 interference data
- Expands the metric system to 9 keys: 6 Claude-scored + 3 Azure-computed (`pronunciationAccuracy`, `prosodyScore`, `speakingRate`)

## Files Changed
| File | Action | Notes |
|------|--------|-------|
| `prisma/schema.prisma` | Modified | SCORING enum, PronunciationReport, WordPronunciation, SpeakingSession relation |
| `prisma/migrations/…/migration.sql` | Created | Schema migration |
| `src/lib/pipeline/executePipeline.ts` | Modified | Pipeline restructure with Azure step + finally block |
| `src/lib/pipeline/persistPronunciation.ts` | Created | Atomic DB persistence for pronunciation data |
| `src/lib/ai/analyze.ts` | Modified | PronunciationSummary type, optional third parameter |
| `src/lib/metric-keys.ts` | Modified | 9 keys (was 6) |
| `src/features/session/useSessionStatus.ts` | Modified | SCORING + pronunciationReport schema |
| `src/features/session/useSessionStatus.types.ts` | Modified | New pronunciation types |
| `src/features/dashboard/dashboard.types.ts` | Modified | 3 new MetricKey literals |
| `src/features/dashboard/getDashboardData.ts` | Modified | 9-key metric system |
| `src/features/dashboard/DashboardView/useDashboard.ts` | Modified | Updated Zod validation |
| `src/app/(app)/session/[id]/page.tsx` | Modified | Metric labels + drill map for 3 new keys |
| `src/app/api/sessions/[id]/route.ts` | Modified | pronunciationReport in API response |
| `src/components/ui/ProcessingStatus/ProcessingStatus.tsx` | Modified | SCORING step in UI |
| `src/components/ui/ProcessingStatus/ProcessingStatus.types.ts` | Modified | SCORING in status union |
| `src/features/recording/useAudioRecorder.ts` | Modified | 16kHz mono, NS/EC/AGC disabled |
| Training components (7 files) | Modified | 'pronunciation' DrillType added throughout |
| Test files (3 files) | Modified | Updated mocks and assertions |

## Architecture Decisions
| Decision | Why |
|----------|-----|
| R2 deletion in `finally` block | Azure needs PCM buffer (derived from same download); cleanup must happen after Azure, not after Whisper |
| Azure failure is non-blocking | Missing pronunciation data is acceptable; failing the whole pipeline is not |
| 3 new metrics not scored by Claude | Azure provides higher-precision phoneme scoring; Claude's prompt explicitly excludes them |
| Intelligibility-first score curve | Accented speech is not penalized like genuinely unclear speech |
| NS/EC/AGC disabled in recorder | Processing enhancers attenuate `/s/`, `/ʃ/`, `/θ/` — exactly the phonemes pronunciation scoring depends on |

## Testing Checklist
- [x] `npx prisma migrate dev` applies cleanly
- [x] `npx tsc --noEmit` passes with zero errors
- [x] `npm run lint` passes
- [x] `npm run test` passes (250 tests, 4 skipped)
- [ ] Pipeline reaches DONE with Azure credentials present (manual)
- [ ] Pipeline reaches DONE without Azure credentials (manual)
- [ ] `pronunciation_reports` row exists after a scored session (manual)
- [ ] `word_pronunciations` rows exist for each word (manual)
- [ ] 3 MetricSnapshots created for pronunciation keys (manual)
- [ ] Session detail API returns `pronunciationReport` field (manual)
- [ ] Zod parse on session detail does not throw (manual)
- [ ] ProcessingStatus UI shows "Scoring pronunciation..." step (manual)

## Deployment Notes
- Prisma migration required: `npx prisma migrate deploy`
- No new env vars required — `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION` were already in `.env`
- Existing sessions are unaffected — `pronunciationReport` is optional on all responses

## Validation
```
npx prisma migrate dev → Applied migration clean
npx tsc --noEmit → 0 errors
npm run lint → No ESLint warnings or errors
npm run test → 250 passed | 4 skipped
```
