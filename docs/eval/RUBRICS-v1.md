# RUBRICS-v1 — Anchored 1–10 scoring rubrics for the 7 LLM-judged metrics

**Rubric version:** `v1`
**Source of truth:** `src/lib/ai/analyzePromptSections.ts`
**Purpose:** Human raters and the AI judge share identical band definitions. Read this document before and during each labelling session opened by `scripts/eval/label.ts`.

---

## How to use this document

Each metric below maps directly to a key in the `JUDGED_METRIC_KEYS` array (`src/lib/eval/golden.types.ts`). For each session you label, assign a score from 1–10 for all 7 metrics using the band anchors below. When in doubt between two adjacent bands, ask: does the evidence lean toward the higher or lower descriptor? Assign the score accordingly — do not split the difference without a clear reason.

---

## 1. `connectorRepetition`

**Definition:** Measures how much the speaker relies on a narrow set of connectors ("and", "so", "but", "because") versus using a varied set of discourse markers.

| Band | Score | Anchor descriptor | Example |
|------|-------|-------------------|---------|
| Low | 1–3 | Every clause is joined with "and", "so", or "but". No variety at all. More than 80% of connectors are drawn from the same 1–2 words. | "I went to the shop and I bought milk and I came home and I made dinner." |
| Mixed | 4–6 | Some variety visible — speaker uses 3–4 different connectors but still defaults to "so" or "and" when under pressure. | "I think it was a good idea. However, I still used 'so' most of the time and I wasn't sure why." |
| Strong | 7–10 | Wide range of connectors used naturally and appropriately: "however", "in contrast", "as a result", "that said", "consequently", "notwithstanding". | "The plan had merit; however, the timeline was unrealistic. As a result, we revised the scope." |

---

## 2. `structuralVariety`

**Definition:** Measures whether the speaker varies sentence structures — mixing simple, compound, and complex sentences — or relies on one repetitive pattern.

| Band | Score | Anchor descriptor | Example |
|------|-------|-------------------|---------|
| Low | 1–3 | Almost every sentence follows the same Subject-Verb-Object pattern. No complex clauses, no inversions, no relative clauses. | "I like coffee. I drink it every morning. It helps me focus. I buy it at the shop." |
| Mixed | 4–6 | Some complex sentences present but overreliance on one structure remains. Speaker occasionally uses a relative clause or conditional but then reverts. | "I think that's interesting because it shows how people think, but most of the time I just say what I want to say." |
| Strong | 7–10 | Genuine mix of structures: relative clauses, passives, cleft sentences, fronting, conditionals, and subordinate clauses used naturally across the session. | "What surprised me most was how quickly the situation changed — had we known earlier, we would have acted differently." |

---

## 3. `vocabularyPrecision`

**Definition:** Measures whether the speaker chooses words that are precise and contextually appropriate versus vague, generic fillers. Mirrors the vocabulary diversity analysis in `VOCABULARY_DIVERSITY_PROMPT_SECTION` and the repetition-flags logic.

| Band | Score | Anchor descriptor | Example |
|------|-------|-------------------|---------|
| Low | 1–3 | Heavy reliance on vague all-purpose words: "thing", "stuff", "good", "bad", "nice", "make", "do". No precise alternatives attempted. | "It was a really good thing and I think the stuff they did was pretty nice overall." |
| Mixed | 4–6 | Some precise vocabulary present — speaker reaches for a better word occasionally but falls back on fillers under fluency pressure. | "The presentation was effective, but I think... the way they did the, the thing at the end was good." |
| Strong | 7–10 | Speaker consistently selects contextually precise words. Vague fallbacks are rare or absent. Academic and domain-appropriate vocabulary used naturally. | "The proposal was compelling, the methodology rigorous, and the projected outcome measurable." |

---

## 4. `verbAccuracy`

**Definition:** Measures how accurately the speaker uses verb tenses, aspect, and subject-verb agreement. A recurring error on the same verb form counts more than isolated slips (see ASR guard: single instances are not patterns).

| Band | Score | Anchor descriptor | Example |
|------|-------|-------------------|---------|
| Low | 1–3 | Multiple recurring tense errors, agreement mismatches, or aspect confusion that impede understanding. Pattern is consistent across the session. | "Yesterday I go to the shop and I have buy three things and now I was tired." |
| Mixed | 4–6 | Mostly accurate but one or two verb patterns recur as errors across the session — e.g. consistent present-simple where present-perfect is needed, or "have went" type forms. | "I have lived here since five years and I am knowing the area quite well." |
| Strong | 7–10 | Tenses, aspect, and agreement are accurate throughout. Any errors are isolated slips, not patterns. Complex verb forms (conditionals, subjunctive-adjacent modal stacks) used correctly. | "By the time they arrived, we had already resolved the issue and were moving on to the next phase." |

---

## 5. `argumentClosure`

**Definition:** Measures whether the speaker introduces a point and then closes it with a conclusion or summary, versus leaving ideas incomplete or trailing off. Mirrors the "topic development" dimension of `COHERENCE_PROMPT_SECTION`.

| Band | Score | Anchor descriptor | Example |
|------|-------|-------------------|---------|
| Low | 1–3 | Speaker raises a point and then shifts to a different topic without conclusion. Multiple incomplete thoughts. The listener cannot identify what the speaker's position was. | "So I think the problem is that... well there are many factors and it depends, and also the situation is complex..." |
| Mixed | 4–6 | At least one argument arc is visible — speaker introduces and develops a point — but the session as a whole contains incomplete threads. Conclusion is implicit rather than stated. | "I think remote work has benefits. There are challenges too. Some people prefer the office, others don't." |
| Strong | 7–10 | Every main point is introduced, developed with support, and explicitly closed with a summary sentence or takeaway. The listener can reconstruct the speaker's argument. | "Remote work increases autonomy and reduces commute costs. The main challenge is collaboration overhead. On balance, a hybrid model offers the best of both." |

---

## 6. `lexicalSophistication`

**Definition:** Measures the ratio of mid-frequency, low-frequency, and rare vocabulary to total unique content words. Directly mirrors the rubric in `LEXICAL_SOPHISTICATION_PROMPT_SECTION`.

| Band | Score | Anchor descriptor | Example |
|------|-------|-------------------|---------|
| Low | 1–3 | Almost entirely high-frequency basic vocabulary: "good", "big", "important", "make", "get", "nice", "things". No academic or domain-specific words. | "It was a big and important thing and I think it was good for all the people there." |
| Mixed | 4–6 | Mix of high and mid-frequency words. Occasional precise vocabulary ("establish", "demonstrate", "perspective") but surrounded by basic filler. | "I think it's important to establish a clear perspective, but most of the things were pretty standard and good." |
| Strong | 7–10 | Consistent use of mid-to-low frequency academic and professional vocabulary used naturally in context: "notwithstanding", "mitigate", "contingent", "articulate", "substantiate". | "Notwithstanding the logistical constraints, the team managed to articulate a coherent and substantiated proposal." |

---

## 7. `registerPragmatics`

**Definition:** Measures whether the speaker's register is appropriate for the context, whether they hedge appropriately, and whether they use discourse functions (disagreeing, clarifying, topic-shifting) with pragmatic competence. Directly mirrors `REGISTER_PRAGMATICS_PROMPT_SECTION`.

| Band | Score | Anchor descriptor | Example |
|------|-------|-------------------|---------|
| Low | 1–3 | Frequent register mismatches (too casual in formal context, or over-formal in casual chat). No hedging — sounds blunt or rude. Missing softeners on disagreements. | "That's wrong. You need to do it differently. Change the plan." |
| Mixed | 4–6 | Generally appropriate register, some hedging present but inconsistent. Occasional directness issues — one or two unhedged directives or register slips per session. | "I think you should probably change the approach. It might work better. Also the timeline is wrong." |
| Strong | 7–10 | Register well-matched to context throughout. Hedging natural and varied: "It might be worth considering...", "I'd argue that...", "To some extent...". Discourse functions (topic shifts, polite disagreement) executed smoothly. | "That's an interesting perspective. I'd argue, however, that the data points in a slightly different direction — it might be worth revisiting the assumptions." |

---

## Scoring notes for human raters

- **ASR guard:** Do not penalise a verb or vocabulary issue that appears only once. Single instances may be transcription artefacts (Whisper failure modes). Only patterns that recur across the session count.
- **Band boundaries:** Scores 3, 6, and 7 are the inflection points. A 3 is the worst of the Low band; a 7 is the entry point to Strong. Use the full range — a genuine 1 or a 10 is valid.
- **Transcript length:** For transcripts under ~20 words, skip `lexicalSophistication` and mark it `null` (the AI prompt already skips it; human labels should match).
- **Immutability:** These band definitions are pinned to rubric version `v1`. If definitions change, a new versioned file (`RUBRICS-v2.md`) is created and `RUBRIC_VERSION` in `src/lib/eval/rubricVersion.ts` is incremented. Never edit this file retroactively — existing `GoldenLabel` rows reference `v1` by version tag.
