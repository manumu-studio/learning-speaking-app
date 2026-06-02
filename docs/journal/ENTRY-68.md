# ENTRY-68 — Naturalness Detection Pipeline

**Date:** 2026-06-02
**Type:** Feature
**Branch:** `feat/speech-analysis-naturalness`
**Version:** `0.61.0`

---

## What I Did

Added a Naturalness dimension to the Speech Analysis feedback — the 5th language category after Grammar, Vocabulary, Structure, and Register & Pragmatics. This detects awkward-but-grammatical phrasing, unnatural collocations, and Spanish L1 transfer calques — the signature C1→C2 gap where speech is grammatically clean but lexically "safe" and under-idiomatic.

The system uses a hybrid detection pipeline:
- **Tier 1 (high confidence):** Deterministic calque checklist — 30 items covering false friends, calqued collocations, and calqued syntax patterns specific to Bogotá-Spanish transfer
- **Tier 3 (low confidence):** Claude Haiku flags discourse markers, hedging, register mismatch, and rhythm issues
- **Confidence gate:** Merges both sources, deduplicates, assigns confidence tiers

User feedback (thumbs up/down) on each flag is collected for future precision tuning.

## Files Touched

| File | Action | Notes |
|------|--------|-------|
| `prisma/schema.prisma` | Modified | Added `NaturalnessFlag` model with relations |
| `prisma/migrations/20260602120000_add_naturalness_flag/` | Created | Migration SQL |
| `src/lib/naturalness/naturalness.types.ts` | Created | Type unions for flag types, dimensions, confidence |
| `src/lib/naturalness/calqueList.ts` | Created | 30-item deterministic calque checklist |
| `src/lib/naturalness/calqueList.types.ts` | Created | CalqueEntry type |
| `src/lib/naturalness/detectCalques.ts` | Created | Regex-based calque scanner |
| `src/lib/naturalness/detectCalques.test.ts` | Created | 12 unit tests |
| `src/lib/naturalness/confidenceGate.ts` | Created | Tier merger + deduplication |
| `src/lib/naturalness/confidenceGate.test.ts` | Created | 7 unit tests |
| `src/lib/ai/analyze.ts` | Modified | Added `naturalness` array to Zod schema |
| `src/lib/ai/analyzePromptSections.ts` | Modified | Added NATURALNESS_PROMPT_SECTION |
| `src/lib/ai/analyzePrompts.ts` | Modified | Wired naturalness into system prompt |
| `src/lib/ai/analyzePromptSchema.ts` | Modified | Extended JSON schema |
| `src/lib/pipeline/processFinal.ts` | Modified | Runs calque detection + merges + persists flags |
| `src/lib/pipeline/persistNaturalness.ts` | Created | Idempotent persistence helper |
| `src/app/api/sessions/[id]/route.ts` | Modified | Includes naturalness flags in response |
| `src/features/session/useSessionStatus.types.ts` | Modified | Added NaturalnessFlagDetail type |
| `src/features/session/useSessionStatus.ts` | Modified | Added Zod schema + transform |
| `src/components/ui/NaturalnessFlagCard/` | Created | 3-file component (card + types + barrel) |
| `src/features/session/NaturalnessInsights/` | Created | 3-file component (section + types + barrel) |
| `src/app/(app)/session/[id]/SessionFeedbackSections.tsx` | Modified | Wired NaturalnessInsights after Register |
| `src/app/api/naturalness/[flagId]/feedback/route.ts` | Created | POST feedback endpoint |

## Decisions

- **Precision over recall:** Following research (F0.5 metric), false positives are worse than misses for advanced learners. Deterministic calques are high confidence; Claude-only flags are low confidence with softer visual treatment.
- **Tier 2 deferred:** Log Dice corpus lookup deferred to 44R.1 — shipping with calque list + Claude-only for now.
- **Visual hierarchy:** Amber (L1 transfer), blue (collocation), gray (style note) — confidence drives the visual weight.
- **Idempotent persistence:** Flags are deleted + recreated on each pipeline run, not upserted, to handle reprocessing cleanly.

## Still Open

- Log Dice corpus confirmation for medium-confidence tier (PACKET-44R.1)
- Naturalness as a scored dashboard metric (needs sufficient flag data first)
- Day-aggregated naturalness trends (PACKET-44T)

## Validation

```
npx tsc --noEmit        ✅ Zero errors
npm run build           ✅ Clean build
npm run lint            ✅ Zero warnings
npm test -- --run       ✅ 147 files, 1158 tests passed
```
