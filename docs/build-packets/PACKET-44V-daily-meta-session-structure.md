# PACKET-44V — Daily Meta-Session Structure + Current-Day Cutoff

**Branch:** `feat/daily-meta-session-structure`
**Version:** `0.65.0`
**Depends on:** PACKET-44T (DailyConclusion + LanguageBankItem), PACKET-44S (Priority Sounds), PACKET-44R (Naturalness)
**Status:** ⏳ Spec
**Created:** 2026-06-03

---

## Goal

Restructure History and session results around one rule:

> A completed day behaves like a **meta-session**. A normal session only shows the two evaluation sections: **Speech Quality** and **Pronunciation & Intonation**.

At the 10pm cutoff, the app creates or finalizes a daily card that groups all completed sessions from that date and builds the full day-level structure:

1. Sessions
2. Speech Quality
3. Pronunciation & Intonation
4. General Feedback
5. Transcript

The current day stays open until 10pm and should not show a completed day card while more sessions can still be added.

---

## Product Rules

### Current Day

Before 10pm:

- History shows a **Today** section with the day's sessions only.
- No daily card is shown for Today.
- No day-level General Feedback is generated yet.
- The user can continue adding sessions to the open day.

At or after 10pm:

- The day is closed for summary purposes.
- The app creates or refreshes the `DailyConclusion` for that date.
- History shows the completed day card for that date.
- The day card links to the full meta-session detail view.

If the user opens a previous day without a `DailyConclusion`, the app may lazily generate it using the same cutoff logic.

### Normal Session Detail

Normal session pages should keep the focused evaluation view:

1. **Speech Quality**
2. **Pronunciation & Intonation**

Do not show day-only sections on a normal session page:

- No Sessions section.
- No day-level General Feedback section.
- No 16-word daily suggestion engine.
- No daily active-target card.

The normal session can still expose transcript text where it supports evaluation, but the top-level session IA should remain the two evaluation categories only.

### Completed Day Detail

The day detail page is a day-level version of the session detail page: same hero idea, but aggregated across all sessions from the day.

```
Day hero
  - date
  - overall score
  - total sessions
  - total minutes
  - total words
  - focus areas
  - topic sentence grounded in intentLabels

Sections
  1. Sessions
  2. Speech Quality
  3. Pronunciation & Intonation
  4. General Feedback
  5. Transcript
```

---

## Day Sections

### 1. Sessions

Navigation-only section. No sub-categories.

Each session row shows:

- Line 1: session number, time, topic or `intentLabel`
- Line 2: two metrics:
  - pronunciation/prosody metric, for example `Fluency -4%`
  - most relevant Speech Quality metric for that session
- Tap target to the individual session detail page

### 2. Speech Quality

This is the day-level version of the session's Language Feedback.

Required sub-categories:

- Grammar
- Vocabulary
- Structure
- Register & Pragmatics, conditional
- Naturalness, conditional
- Word Bank

Metric grouping:

- Grammar: `verbAccuracy`
- Vocabulary: `vocabularyPrecision`, `lexicalSophistication`
- Structure: `structuralVariety`, `argumentClosure`, `connectorRepetition`
- Register & Pragmatics: `registerPragmatics`
- Naturalness: `NaturalnessFlag` summaries and corpus-backed collocation issues
- Delivery-only metrics such as `fillerUsage` stay out of Speech Quality unless explicitly reframed later.

This section absorbs day wins and struggles related to language quality. It must not render both flat pillar cards and flat metric cards at the same hierarchy level.

### 3. Pronunciation & Intonation

This is the day-aggregated version of the session pronunciation section.

Required sub-categories:

- Score summary: accuracy, fluency, completeness, prosody
- Phoneme Patterns
- Priority Sounds
- Rhythm & Intonation summary
- Prosody details: rate, pauses, stress, pitch movement
- Pitch Contour
- Pronunciation Tips
- Practice Suggestion
- Accent Polish
- Pronunciation Progress

The old standalone Word Color Map should not appear here as a repeated transcript surface. Pronunciation word accuracy moves into the Transcript section as a clickable layer.

Rhythm & Intonation must be pattern-level coaching, not a raw list of every pitch issue. Do not render dozens of repeated word cards such as "Pitch: this sounds flat" for function words. Instead:

- Summarize the top 2-3 prosody patterns for the session/day.
- Group issues by type: pitch variety, sentence stress, pausing/chunking, speaking rate, monotone stretches.
- Use phrase-level examples from the transcript, not isolated low-value words.
- Show counts as context only, for example "18 flat-stress moments across 4 long explanations."
- Keep detailed word-level prosody available from the clickable Transcript pronunciation map when it helps.
- Hide or collapse minor repeated issues by default.

### 4. General Feedback

Day-only section. This does not belong on normal session pages.

Required sub-categories:

- Summary
- Suggestion Words
- Word Bank
- Active Targets

Summary requirements:

- Plain text, 200-300 words.
- Evaluate both Speech Quality and Pronunciation & Intonation.
- Mention wins, struggles, and insights.
- Include a brief comparison with the previous day when previous-day data exists.
- Avoid becoming a long analytics report.

Suggestion Words requirements:

- 16 total suggestions.
- 4 suggestions per type.
- Suggestions are based on the learner's performance across the day's completed sessions.
- The 16 suggestions are candidates for tomorrow; the 4 active targets are chosen from those 16 and also shown on the subtle day card.

Suggestion types:

1. Collocations
2. Connectors
3. Adjectives and adverbs, alternating by day
4. Verbs, rotating in this order:
   - phrasal verbs
   - prepositional verbs
   - frequent useful verbs not already in the user's Word Bank

Selection source:

- Pronunciation & Intonation results, especially weak phonemes and bad phonetic patterns.
- Speech Quality results, especially overused words, vague vocabulary, naturalness flags, and verb/preposition issues.
- Similar well-ranked words that contain sounds the learner struggled to pronounce.
- Prepositional verbs that match detected preposition/verb-pattern weaknesses.
- Phrasal verbs and high-value ranked verbs that are absent or underused in the learner's speaking.
- Synonyms or more precise alternatives for overused or vague words from the day's sessions.
- The engine should not simply repeat words from the transcript; it should convert performance evidence into tomorrow's highest-leverage practice words.

### 5. Transcript

The Transcript section is the canonical text surface.

It supports per-session expansion inside a completed day. Each session transcript has modes:

- Pronunciation map (default first tab)
- Your words
- Improved

The Pronunciation map replaces the old separate Word Color Map panel:

- It keeps the same punctuation, paragraph breaks, and readable separation as the transcript.
- Words are colored by pronunciation accuracy.
- Words remain clickable.
- Clicking a word opens the existing detail panel:
  - word
  - expected IPA
  - what the learner said
  - accuracy
  - phoneme breakdown
  - accent pattern
  - how to improve

All transcript modes must preserve punctuation, paragraph breaks, and readable separation. The only difference between modes is the layer applied to the same transcript structure:

- Pronunciation map: colored, clickable pronunciation words.
- Your words: readable original transcript.
- Improved: rewritten transcript when a rewrite exists.

---

## Architecture

### New Deep Module

Create a day-detail read model module:

```
src/lib/daily/dayDetail/
├── buildDayDetailData.ts
├── buildDayDetailData.types.ts
├── buildDaySessions.ts
├── buildDaySpeechQuality.ts
├── buildDayPronunciation.ts
├── buildDayGeneralFeedback.ts
├── buildDayTranscript.ts
└── index.ts
```

This module is the seam between database/session evidence and the UI. UI components should render the resulting data and avoid re-deriving aggregation rules.

### Read Model Shape

```typescript
interface DayDetailData {
  hero: DayHeroData;
  sessions: DaySessionSummary[];
  speechQuality: DaySpeechQualityData;
  pronunciation: DayPronunciationData;
  generalFeedback: DayGeneralFeedbackData;
  transcript: DayTranscriptData;
}
```

### API

Add or extend:

```
GET /api/daily/[date]
```

The route should return the full `DayDetailData` for day detail consumers and the smaller summary fields needed by the History card.

The route must:

- Require auth.
- Scope all Prisma queries by `userId`.
- Validate `date` with Zod.
- Generate the `DailyConclusion` lazily only for closed days or past days.
- Avoid creating a day card for the current day before 10pm.

---

## UI Changes

### History

Modify:

```
src/components/ui/HistoryDayGroup/
src/features/history/DailySummaryCard/
src/app/(app)/history/HistorySessionList.tsx
```

Rules:

- Today: render session list only.
- Past/closed days: render subtle day card.
- Day card shows date, session count, duration, overall score, topic sentence, and 4 colored active-target pills.
- Tap day card routes to `/history/day/[date]`.

### Day Detail

Modify:

```
src/features/history/DayDetailContent/
```

Replace the current shallow sections with:

1. Sessions
2. Speech Quality
3. Pronunciation & Intonation
4. General Feedback
5. Transcript

### Session Detail

Modify:

```
src/app/(app)/session/[id]/SessionFeedbackSections.tsx
src/app/(app)/session/[id]/SessionDoneView.tsx
```

Rules:

- Keep only top-level Speech Quality and Pronunciation & Intonation evaluation sections.
- Remove day-only General Feedback, daily targets, and daily suggestion surfaces from normal session pages.
- Move clickable word pronunciation map behavior into the transcript layer rather than rendering a separate standalone Word Color Map panel.

---

## Scope Boundaries

In scope:

- Current-day vs closed-day history behavior.
- Day detail five-section meta-session.
- Normal session IA reduced to evaluation sections 2 and 3.
- Day-level read model.
- Transcript modes with clickable pronunciation map.
- 16 suggestion words data shape and display slots.

Out of scope:

- New ASR provider integration.
- Corpus-grounded scoring changes beyond consuming existing `NaturalnessFlag` and Word Bank data.
- Full mastery algorithm rewrite unless needed to expose active targets.
- Mobile native implementation.

---

## Acceptance Criteria

- [ ] Before 10pm, Today shows sessions only and no daily card.
- [ ] After 10pm or for past days, History shows a completed day card.
- [ ] Tapping a completed day card opens the day meta-session view.
- [ ] Day detail renders exactly five sections: Sessions, Speech Quality, Pronunciation & Intonation, General Feedback, Transcript.
- [ ] Normal session detail exposes only the two evaluation sections as top-level categories: Speech Quality and Pronunciation & Intonation.
- [ ] Speech Quality is hierarchical and does not duplicate register or vocab sections.
- [ ] Pronunciation & Intonation no longer repeats the transcript as a standalone Word Color Map.
- [ ] Transcript supports `Your words`, `Improved`, and clickable `Pronunciation map`.
- [ ] Clicking a word in Pronunciation map opens the existing phoneme/IPA detail panel.
- [ ] General Feedback includes summary, 16 suggestions, grouped Word Bank, and 4 active targets.
- [ ] API queries are scoped to `userId` and date input is Zod-validated.
- [ ] `npm run typecheck`, `npm run lint`, `npm test -- --run`, and `npm run build` pass.

---

## Suggested Task Split

| Task | Work | Files |
|------|------|-------|
| 1 | Add `DayDetailData` types and Zod schemas | `src/lib/daily/dayDetail/` |
| 2 | Build day sessions summary aggregation | `buildDaySessions.ts` |
| 3 | Build day Speech Quality hierarchy | `buildDaySpeechQuality.ts` |
| 4 | Build day Pronunciation aggregation | `buildDayPronunciation.ts` |
| 5 | Build day General Feedback shape with 16 suggestion slots | `buildDayGeneralFeedback.ts` |
| 6 | Build day Transcript model with transcript modes | `buildDayTranscript.ts` |
| 7 | Extend `GET /api/daily/[date]` to return the read model | `src/app/api/daily/[date]/route.ts` |
| 8 | Update History current-day vs closed-day behavior | `HistoryDayGroup`, `HistorySessionList`, `DailySummaryCard` |
| 9 | Replace DayDetailContent with five-section meta-session | `src/features/history/DayDetailContent/` |
| 10 | Reduce normal session top-level IA to evaluation sections | `SessionFeedbackSections`, `SessionDoneView` |
| 11 | Move clickable pronunciation map into transcript mode | transcript and word pronunciation components |
| 12 | Tests and docs | unit/component tests, packet report, journal, PR doc |
