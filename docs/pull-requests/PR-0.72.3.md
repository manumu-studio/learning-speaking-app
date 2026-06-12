# PR-0.72.3 — Code Complexity: File Split Pass

**Branch:** `refactor/code-complexity-audit` → `main`
**Version:** `0.72.3`
**Date:** 2026-06-12
**Status:** ✅ Ready to merge

---

## Summary

Four production files were at or above the 300-line module-size limit enforced by
ESLint `max-lines` (a CI-blocking rule). Each was split into two focused files with
**no behavior changes** and **no public API changes**. After this change every file
under `src/` is below the limit.

## Files Changed

| Original file | Extracted to | What moved |
|---------------|--------------|------------|
| `src/lib/pipeline/processFinal.ts` | `persistAnalysis.ts` | DB persistence worker |
| `src/lib/ai/azurePronunciation.ts` | `azureSdkMappers.ts` | SDK type defs + mappers |
| `src/components/ui/TranscriptToggle/TranscriptToggle.tsx` | `PronunciationMap.tsx` | Pronunciation token-map component |
| `src/components/ui/HeroCanvas/heroCanvasUtils.ts` | `FilmGrain.ts` | Film-grain canvas class |

## Architecture Decisions

| Decision | Why |
|----------|-----|
| `highlightWords` remains in `TranscriptToggle.tsx` | It is used by the parent component, not only by the extracted map |
| `FilmGrain` re-exported from `heroCanvasUtils.ts` | Backward compatibility — consumers need no import changes |
| `PersistAnalysisOptions` moves with its function | The interface only types the extracted worker |
| Trimmed each modified file's import list | Extraction orphaned several imports; `noUnusedLocals` would fail otherwise |

## Testing Checklist

- [x] `npm run typecheck` — 0 errors
- [x] `npm run lint` — 0 warnings / 0 errors (no `max-lines` violations)
- [x] `npm test -- --run` — 193 files, 1607 passed, 4 skipped
- [x] `npm run build` — success

## How to Verify

1. Load a session result page — transcript toggle tabs render correctly.
2. Pronunciation map (click a word → phoneme detail) opens and dismisses.
3. Hero canvas animation plays without visual regression.
4. Submit a short recording → session reaches `DONE` status.
5. All CI jobs green (lint + typecheck + test + build).

## Deployment Notes

No environment-variable changes. No migration required. Standard deploy. Pure file
reorganization — no new tests added; existing coverage applies to the moved code.
