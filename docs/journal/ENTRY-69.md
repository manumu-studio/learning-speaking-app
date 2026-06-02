# ENTRY-69 — Functional-Load Pronunciation Prioritization

**Date:** 2026-06-03
**Type:** Feature
**Branch:** `feat/pronunciation-redesign`
**Version:** `0.62.0`

---

## What I Did

Reworked the Pronunciation & Intonation section so it leads with the errors that matter most for being understood, rather than presenting every phoneme error as equally important. The reorganization is built on functional-load theory: high-functional-load errors (e.g. the ship/sheep vowel contrast) measurably reduce comprehensibility, while low-functional-load ones (e.g. the "th" sounds) barely affect it even when frequent.

Three things changed for the learner:
1. **Priority Sounds** now sits near the top — the 2–3 highest-impact errors, each with a concrete production rule ("how to make this sound") and IPA-annotated example words, with long vowels and diphthongs visually highlighted.
2. **Accent Polish** collects the low-impact items at the bottom, collapsed and explicitly marked optional.
3. The **Word Map** became a discrete 3-band scale (red <60 / amber 60–84 / green 85+) relabeled "Pronunciation Accuracy".

## Rationale

The previous section was flat: a single weak-phoneme list sorted by raw accuracy, which buried high-leverage errors under cosmetic ones. For an advanced learner targeting near-native speech, that wastes attention — a `/θ/` slip and a dropped final consonant are not equally worth practising. Functional load gives a principled ranking (`weight × frequency`) so the section's hierarchy mirrors actual intelligibility impact.

The green floor was raised from the conventional 80 to **85** deliberately: the target here is C2/near-native, so "solid" should mean genuinely solid.

## Key Decisions

- **One knowledge base, two granularities.** The functional-load table mixes phoneme-level entries (joined to per-phoneme accuracy scores) with structural patterns Azure cannot score directly — s-cluster epenthesis ("eschool") and dropped final consonants. The structural ones are detected heuristically from per-word phoneme data, keyed on **phoneme identity, not spelling** (so "asked" → /æskt/ is correctly seen as ending in a consonant cluster despite its "-ed" spelling).
- **Production rules + phonetics live in the data, not the UI.** Each entry carries its own `rule` string and IPA examples, so the components stay presentational and the coaching content is reviewable in one place.
- **Rank before filtering.** Ranking runs over *all* tracked phonemes below the C2 floor (85), not the old "5 weakest below 70" view — otherwise a high-impact vowel scoring 78 would never surface. The legacy weak-list view is preserved for the detail section.
- **No retrofit of the existing weak-phoneme list or tips card.** Priority Sounds now owns functional-load prioritization; layering the same ranking onto the older components would duplicate it. They remain the full-detail overview.

## Files Touched

| File | Action | Notes |
|------|--------|-------|
| `src/lib/pronunciation/functionalLoad.types.ts` | Created | FL tiers, weights, entry + ranked-error types |
| `src/lib/pronunciation/functionalLoad.ts` | Created | 12-entry knowledge base + rules + IPA examples + double-vowel detector |
| `src/lib/pronunciation/functionalLoad.test.ts` | Created | 10 unit tests |
| `src/lib/pronunciation/rankByFunctionalLoad.ts` | Created | Ranking + structural-pattern detection |
| `src/lib/pronunciation/rankByFunctionalLoad.test.ts` | Created | 9 unit tests |
| `src/lib/pronunciation/aggregatePhonemes.ts` | Modified | Extracted `aggregateAllPhonemes` (unfiltered) for ranking |
| `src/lib/pronunciation/index.ts` | Modified | Barrel exports |
| `src/components/ui/PrioritySounds/` | Created | 3-file component — high-impact coaching cards |
| `src/components/ui/AccentPolish/` | Created | 4-file component — collapsed low-impact list |
| `src/components/ui/WordColorMap/` | Modified | 3-band scale, semantic color rename, relabel |
| `src/app/(app)/session/[id]/SessionFeedbackSections.tsx` | Modified | Wired Priority Sounds + Accent Polish into the layout |

## Validation

```
npx tsc --noEmit   ✅ Zero errors
npm run lint       ✅ Zero warnings (complexity rules enforced)
npx vitest run     ✅ 149 files, 1177 tests passed (4 skipped)
```

## Still Open

- Day-aggregated pronunciation priorities (belongs to the daily-feedback work)
- Optionally re-sorting the full weak-phoneme detail list by functional load for consistency
