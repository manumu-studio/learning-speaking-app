# ENTRY-82 — Code Complexity: File Split Pass

**Date:** 2026-06-12
**Type:** Refactor
**Branch:** `refactor/code-complexity-audit`
**Version:** `0.72.3`

---

## What I Did

Split four source files that were at or above the 300-line `max-lines` ceiling enforced
by ESLint (CI-blocking). Each was divided into two focused modules with no behavior
changes, no renamed exports, and no public API changes — pure file reorganization so
every file under `src/` now sits below the limit.

| Original file | Lines before | Extracted into | What moved |
|---------------|--------------|----------------|------------|
| `src/lib/pipeline/processFinal.ts` | 300 | `persistAnalysis.ts` | DB persistence worker (`persistAnalysisAndFinalize`) |
| `src/lib/ai/azurePronunciation.ts` | 314 | `azureSdkMappers.ts` | SDK type defs + phoneme/prosody mappers |
| `src/components/ui/TranscriptToggle/TranscriptToggle.tsx` | 311 | `PronunciationMap.tsx` | Pronunciation token-map component |
| `src/components/ui/HeroCanvas/heroCanvasUtils.ts` | 321 | `FilmGrain.ts` | Film-grain canvas class |

## Files Touched

| File | Action | Notes |
|------|--------|-------|
| `src/lib/pipeline/persistAnalysis.ts` | Created | Persistence worker + `PersistAnalysisOptions` |
| `src/lib/pipeline/processFinal.ts` | Modified | Imports the worker; dropped 10 now-unused imports |
| `src/lib/ai/azureSdkMappers.ts` | Created | SDK types + `mapPhoneme`/`buildProsodyFeedback`/`collectWordsFromEvent` |
| `src/lib/ai/azurePronunciation.ts` | Modified | Imports `collectWordsFromEvent`; trimmed unused type imports |
| `src/components/ui/TranscriptToggle/PronunciationMap.tsx` | Created | Token-map component + alignment utilities |
| `src/components/ui/TranscriptToggle/TranscriptToggle.tsx` | Modified | Imports `PronunciationMap`; `highlightWords` stays |
| `src/components/ui/HeroCanvas/FilmGrain.ts` | Created | `FilmGrain` class |
| `src/components/ui/HeroCanvas/heroCanvasUtils.ts` | Modified | Imports + re-exports `FilmGrain` for backward compatibility |

## Decisions

- `highlightWords` stays in `TranscriptToggle.tsx` — it is called by the parent
  component, not only by the extracted token map.
- `FilmGrain` is re-exported from `heroCanvasUtils.ts` so existing consumers
  (e.g. `HeroCanvas.tsx`) need no import changes.
- `PersistAnalysisOptions` moves with the function it types into `persistAnalysis.ts`.
- Each modified file's import list was trimmed to only what it still references —
  the extraction left several imports orphaned, and `noUnusedLocals` would otherwise fail.

## Still Open

- Nothing outstanding. All four source files are now under 300 lines (largest is
  `heroCanvasUtils.ts` at 228).

## Validation

```
npm run typecheck   → 0 errors
npm run lint        → 0 warnings / 0 errors (no max-lines violations)
npm test -- --run   → 193 files, 1607 passed, 4 skipped
npm run build       → success
```
