# Training Feature

> Powers the structured drill system and reading practice — generates targeted exercises from session weaknesses, evaluates attempts, and tracks drill history.

## Responsibilities
- Recommending the most relevant drill type for the user's weakest metric
- Generating personalized drill prompts (template-based for precision/conclusion; Claude Haiku for others)
- Evaluating drill attempts (heuristic fast-path + AI evaluation)
- Displaying the drill UI with a countdown timer, prompt card, and feedback
- Showing drill history and per-metric statistics
- Reading practice: generating personalized texts from pronunciation weaknesses and vocabulary gaps, then assessing recorded readings

## Key Modules
| File / Folder | Purpose |
|---------------|---------|
| `recommendDrill.ts` | Selects the best drill type for the user's lowest-scoring metric; fetches session insights for examples |
| `generateDrill.ts` | Builds drill prompts — template path for `precision`/`conclusion`; Claude Haiku for `rephrase`, `constraint`, `vocabUpgrade`, `pronunciation` |
| `evaluateDrill.ts` | Evaluates a completed drill attempt; returns score, `improved` flag, and feedback |
| `training.types.ts` | Shared types: `DrillType`, `DrillPrompt`, `DrillRecommendation` |
| `DrillView/` | Orchestrating drill screen; `useDrill` manages flow from prompt → attempt → feedback |
| `DrillTimer/` | Countdown timer component with visual indicator |
| `DrillPromptCard/` | Displays the active drill prompt text |
| `DrillFeedback/` | Renders AI-generated feedback after drill completion |
| `DrillRecommendation/` | Widget showing the recommended drill on the dashboard |
| `DrillStats/` | Per-metric drill completion counts and improvement rate display |
| `DrillHistoryView/` | Paginated list of past drill attempts; `useDrillHistory` fetches from `/api/drills` |
| `DrillHistoryCard/` | Individual drill attempt summary card |
| `MicroWin/` | Celebratory component shown when a drill shows improvement |
| `ReadingPractice/` | Personalized reading practice sub-feature — library view, practice view, global summary, and session cards; `useReadingPractice` orchestrates generation and recording assessment |

## Data Flow
- `recommendDrill` is called server-side; the recommendation is passed to `DrillView` as props.
- `DrillView` / `useDrill` calls `/api/drills/generate` to get a prompt, collects the user's response, then POSTs to `/api/drills/evaluate`.
- `ReadingPractice` fetches a library of sessions via `/api/reading-practice/library`, generates texts via `/api/reading-practice/generate`, and submits recordings to `/api/reading-practice/assess`.

## Conventions
- 4-file component pattern; types in `.types.ts`; barrel exports via `index.ts`.
- Drill types: `rephrase | constraint | vocabUpgrade | precision | conclusion | pronunciation`.
- Metric-to-drill mapping is defined in `recommendDrill.ts` and is the single source of truth.
