# PR-0.62.0 — Functional-Load Pronunciation Prioritization

**Branch:** `feat/pronunciation-redesign` → `main`
**Version:** `0.62.0`
**Date:** 2026-06-03

---

## Summary

Redesigns the Pronunciation & Intonation section to prioritize pronunciation fixes by **functional load** — how much each error actually affects intelligibility — instead of showing all errors equally. The highest-impact sounds now lead the section with concrete production rules and IPA examples; low-impact "accent polish" items are collapsed and marked optional.

## What Was Built

### Functional-load engine (`src/lib/pronunciation/`)
- **`functionalLoad.ts`** — a 12-entry knowledge base for Bogotá-Spanish → English, each entry carrying a tier/weight, a **production rule**, and **IPA-annotated example words**. Covers both phoneme-level contrasts (ship/sheep, cat-vowel, /v/–/b/, /z/, English /ɹ/, judge/shoe, "th", dark-l, /ŋ/) and structural patterns (s-cluster epenthesis, dropped final consonants, schwa reduction).
- **`rankByFunctionalLoad.ts`** — ranks errors by `weight × frequency`, mixing phoneme errors (joined to Azure per-phoneme scores) with structural patterns detected from per-word phoneme data. `splitByPriority` separates high/moderate "priority" sounds from low "polish".
- **`aggregateAllPhonemes`** — new unfiltered aggregation so ranking sees every phoneme below the C2 floor (85), not just the 5 weakest below 70.

### UI
- **`PrioritySounds`** (new) — the top 2–3 high-impact errors as coaching cards: tier badge, production rule, IPA example chips (long vowels / diphthongs underlined), occurrence count + accuracy chip.
- **`AccentPolish`** (new) — low-impact items, collapsed by default, labeled "Optional — rarely affects understanding".
- **`WordColorMap`** — now a discrete 3-band scale (red <60 / amber 60–84 / green 85+), semantically renamed color tokens, relabeled "Pronunciation Accuracy".
- **`SessionFeedbackSections`** — Priority Sounds placed after the score summary; Accent Polish near the end.

## Architecture Decisions

- **Knowledge in data, not components** — rules and phonetics live in the FL table; components are presentational.
- **Structural detection is spelling-proof** — final-consonant detection keys on phoneme identity, so "asked" (/æskt/) is correctly handled despite its "-ed" spelling.
- **Rank before filter** — high-impact errors scoring 78 surface instead of being dropped by the legacy weak-list (<70) view, which is preserved for the detail section.
- **No DB changes** — functional load is computed at render time from the existing pronunciation report.

## Testing

| Gate | Result |
|------|--------|
| `npx tsc --noEmit` | ✅ Zero errors |
| `npm run lint` | ✅ Zero warnings (complexity rules enforced) |
| `npx vitest run` | ✅ 1177 passed, 4 skipped (149 files) — +19 new |

New unit tests cover the FL table integrity, the double-vowel detector, ranking by `weight × frequency`, the rank-before-filter behaviour, and structural-pattern detection (s-cluster, final-consonant).

## How to Validate

1. Open a completed session → **Pronunciation & Intonation**.
2. Confirm **Priority Sounds** appears near the top with rules + IPA examples (long-vowel words underlined).
3. Confirm the **Word Map** uses the 3-band red/amber/green scale and reads "Pronunciation Accuracy".
4. Expand **Accent Polish** at the bottom — low-impact items only.
5. A session with no below-floor errors should hide all three new elements gracefully.

## Deployment Notes

- No migration required.
- No new environment variables.
- Purely additive to the session results page.
