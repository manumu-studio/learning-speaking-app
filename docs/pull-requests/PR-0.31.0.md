# PR-0.31.0 — Whisper Hallucination Guardrails
**Branch:** `feat/whisper-guardrails` → `main`
**Version:** `v0.31.0`
**Date:** 2026-05-27
**Status:** ✅ Ready to merge

---

## Summary
- Prevents Whisper transcription errors from appearing as learner vocabulary or grammar issues in coaching feedback
- Adds four defence layers: domain-biased Whisper, confidence gating, Claude prompt guardrails, and a Compromise.js NER post-filter
- User-facing transcripts stay clean; Claude receives annotated text with `⟨?...?⟩` markers on low-confidence segments

## Architecture

### Before
```
Whisper (default) → plain text → Claude (trusts transcript) → insights
```

### After
```
Whisper (verbose_json + prompt + temp 0)
  → confidence gating (drop silence, ⟨?...?⟩ suspects)
  → clean text → DB / user UI
  → annotated text → Claude (ASR guardrails in prompt)
  → programmatic insight filter + NER post-filter
  → insights stored
```

## Files Changed
| File | Action | Notes |
|------|--------|-------|
| `docs/research/WHISPER-HALLUCINATION-GUARDRAILS.md` | Created | Research reference |
| `src/lib/ai/whisper.ts` | Modified | verbose_json API call |
| `src/lib/ai/whisper.types.ts` | Created | Zod schemas + inferred segment types |
| `src/lib/ai/confidenceGating.ts` | Created | Threshold constants + `gateSegments` |
| `src/lib/ai/confidenceGating.types.ts` | Created | Annotated transcript types |
| `src/lib/ai/analyze.ts` | Modified | ASR prompt + `applyInsightGuardrails` |
| `src/lib/ai/nerFilter.ts` | Created | Compromise NER filter |
| `src/lib/ai/nerFilter.types.ts` | Created | Filter result types |
| `src/lib/pipeline/executePipeline.ts` | Modified | Gating + NER in pipeline |
| `src/app/api/drills/[id]/complete/route.ts` | Modified | Gated transcript for drills |
| `package.json` / `package-lock.json` | Modified | `compromise` dependency |
| `src/lib/ai/confidenceGating.test.ts` | Created | 9 tests |
| `src/lib/ai/nerFilter.test.ts` | Created | 13 tests |
| `src/lib/ai/analyze.test.ts` | Modified | Guardrail tests incl. `?` in markers |
| `src/lib/pipeline/executePipeline.test.ts` | Modified | Whisper mock shape |
| `src/app/api/drills/[id]/complete/route.test.ts` | Modified | Whisper mock shape |

## Architecture Decisions
| Decision | Why |
|----------|-----|
| `verbose_json` + Zod at API boundary | Segment confidence required for gating; never trust raw API shape |
| Domain prompt for engineering vocabulary | Reduces proper-noun substitutions without model retraining |
| `⟨?...?⟩` markers with `[^⟩]*` regex | Safe in JSX; matches suspect text that contains `?` (e.g. questions) |
| Types derived via `z.infer` from whisper schemas | Single source of truth — no manual/Zod drift |
| NER runs after Claude | Deterministic safety net for residual LLM false positives |
| Artefacts logged, not stored in Prisma | Debug transparency without schema migration |
| Drills use `gateSegments` on clean text | Consistent gating on short drill audio |

## Testing Checklist
- [x] `npx tsc --noEmit` passes
- [x] `npm run lint` passes
- [x] `npm run test` passes (284 tests, 4 skipped)
- [ ] End-to-end session with technical vocabulary (manual)
- [ ] Verify user transcript has no `⟨?...?⟩` markers (manual)
- [ ] Verify insights exclude known Whisper false positives (manual)

## Deployment Notes
- No new environment variables — uses existing `OPENAI_API_KEY` and Anthropic credentials
- New npm dependency: `compromise`
- No Prisma migration required

## Validation
```
npx tsc --noEmit → exit 0
npm run lint → No ESLint warnings or errors
npm run test → 284 passed | 4 skipped
```
