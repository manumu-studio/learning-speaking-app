# ENTRY-34 — Whisper Hallucination Guardrails
**Date:** 2026-05-27
**Type:** Feature
**Branch:** `feat/whisper-guardrails`
**Version:** `0.31.0`
---
## What I Did
- Added a four-layer defence between Whisper transcription and Claude coaching analysis so ASR mistakes are not attributed to learners
- Switched Whisper to `verbose_json` with domain vocabulary biasing, `temperature: 0`, and Zod-validated segment metadata
- Built confidence gating to drop silence hallucinations and mark low-confidence segments with `⟨?...?⟩` markers
- Extended the Claude analysis prompt with hard anti-attribution rules and optional `possible_transcription_artefacts` output
- Added a Compromise.js NER post-filter to strip residual proper-noun and tech-term false positives
- Documented research and failure modes in `docs/research/WHISPER-HALLUCINATION-GUARDRAILS.md`

## Files Touched
| File | Action | Notes |
|------|--------|-------|
| `docs/research/WHISPER-HALLUCINATION-GUARDRAILS.md` | Created | Research reference |
| `src/lib/ai/whisper.ts` | Modified | verbose_json + domain prompt |
| `src/lib/ai/whisper.types.ts` | Created | Segment types |
| `src/lib/ai/confidenceGating.ts` | Created | Segment filtering |
| `src/lib/ai/confidenceGating.types.ts` | Created | Annotated transcript types |
| `src/lib/ai/analyze.ts` | Modified | ASR guardrails + schema |
| `src/lib/ai/nerFilter.ts` | Created | NER post-filter |
| `src/lib/ai/nerFilter.types.ts` | Created | Filter result types |
| `src/lib/pipeline/executePipeline.ts` | Modified | Gating + NER wired in |
| `src/app/api/drills/[id]/complete/route.ts` | Modified | New Whisper return shape |
| `package.json` | Modified | `compromise` dependency |
| Test files (6) | Created/Modified | Gating, NER, analyze, pipeline, drill |

## Decisions
- Prompt guardrails first — highest leverage, zero infra cost; no Whisper model change
- Store **clean** transcript for users; send **annotated** transcript to Claude so markers are visible to the model but not the UI
- Log `possible_transcription_artefacts` and NER filter reasons instead of a new DB column — avoids migration for debug-only data
- Frequency filter uses max token occurrence across example quotes, not per-token AND logic — avoids over-filtering multi-word patterns
- `WhisperSegment` types derived from Zod schemas (`z.infer`) — single source of truth with API validation
- Suspect-marker regex uses `[^⟩]*` so question marks inside wrapped text still trigger guardrails
- Drills route applies `gateSegments` for consistency with session pipeline
- Deferred dual-ASR consensus, self-hosted Whisper, and UI transcript correction to future work

## Still Open
- Manual validation on real sessions with known bad examples (Anthropic homophone, pause fabrication)
- Threshold calibration may need tuning per accent cohort after production telemetry

## Validation
```
npx tsc --noEmit → exit 0
npm run lint → No ESLint warnings or errors
npm run test → 284 passed | 4 skipped
```
