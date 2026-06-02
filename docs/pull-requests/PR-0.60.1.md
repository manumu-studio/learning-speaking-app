# PR — v0.60.1: ESLint Complexity Compliance — Zero Suppressions

## Summary

- Removed all inline `eslint-disable` suppressions for complexity rules from `src/`, completing enforcement of the five CI-blocking gates (`max-lines` 300, `max-lines-per-function` 80, `complexity` 15, `max-depth` 3, `max-params` 4)
- Split 82 oversized files into 87 focused single-responsibility modules across library code, UI components, feature modules, API routes, and pages
- Zero behavior change — all 1,139 tests pass, `tsc` is clean, `npm run lint` is clean

## What Changed

169 files total: 87 new, 82 modified.

### Library code (`src/lib/`)

Core AI and pipeline files were split to bring each under the complexity thresholds:

- `azurePronunciation.ts`, `l1Spanish.ts`, `nerFilter.ts`, `rewriteTranscript.ts` — internal logic extracted into focused helpers
- `executePipeline.ts`, `processChunk.ts`, `processChunkIndependent.ts` — stage handlers extracted; public pipeline entry points unchanged
- Prompt library split into `promptLibraryBasePrompts.ts`, `promptLibraryImageRetell.ts`, `promptLibrarySummarizeImpromptu.ts`
- New: `executePipelineHelpers.ts`

### UI components (`src/components/ui/`)

13 components refactored; extracted focused sub-files alongside each:

- `AnnotatedTranscript` → `TranscriptBody.tsx`, `TranscriptHeader.tsx` (+ `.types.ts` for each)
- `PhonemeDetail` → `PhonemeDetailSections.tsx` (+ `.types.ts`)
- `ProcessingToast` → `useProcessingToast.ts`
- `AiDisclosureModal` → `useAiDisclosureModal.ts`
- `HeroCanvas`, `PitchContour`, `TrendChart`, `WordSentenceMap`, `RecordButton`, `ProsodyFeedback`, `ProsodyPanel`, `ProcessingStatus`, `DeleteSessionModal` — oversized logic extracted into co-located helpers or reduced via type file expansions

### Feature modules (`src/features/`)

The highest-complexity areas, spanning recording, training, dashboard, and settings:

- `RecordingPanel` → `RecordingPanelView.tsx`, `RecordingPanelHeader.tsx`, `RecordingControls.tsx`, `RecordingStatusMessages.tsx`, `useCategorySelection.ts`, `useRecordingEffects.ts`, `useRecordingPanelActions.ts`, `useRecordingPanelMedia.ts`
- `useAudioWorklet` → `useAudioWorkletChunk.ts`, `useAudioWorkletHelpers.ts`, `useAudioWorkletPlayback.ts`
- `useChunkUploader` → `useChunkUploaderHelpers.ts`, `useChunkUploaderSession.ts`, `useChunkUploaderUpload.ts`
- `DrillView` / `useDrill` → `useDrillRecording.ts`
- `ReadingPractice` / `PracticeView` → `PracticeView.parts.tsx`, `usePracticeFlow.ts`, `useReadingPractice.api.ts`
- `SettingsPage` → `SettingsAboutSection.tsx`, `SettingsAccountSection.tsx`, `SettingsAiDataSection.tsx`, `SettingsDisplaySection.tsx`, `SettingsTrainingSection.tsx`, `SettingsPage.helpers.tsx`, `settingsApi.ts`
- `OnboardingRecorder` → `RecorderStatusMessage.tsx`, `useOnboardingRecorderState.ts`, `useRecorderCapture.ts`
- `VoiceProfile` → `VoiceProfileFailed.tsx`, `VoiceProfileProcessing.tsx`, `VoiceProfileResults.tsx`
- `DashboardView` → `DashboardView.parts.tsx`; `getDashboardData` → `getDashboardData.build.ts`; `SkillRadar` → `SkillRadar.render.types.ts`
- `FluencyComparison` → `ComparisonTable.tsx`, `MetricRow.tsx`, `WpmBarChart.tsx`
- `TimedRecording` → `RecordButton.tsx`, `RoundIndicator.tsx`, `roundSubmit.ts`, `useCountdownTimer.ts`
- `PromptCard` → `PromptDropdownMenu.tsx`, `PromptTriggerButton.tsx`
- `useSessionHistory` → `sessionHistoryFetcher.ts`

### API routes (`src/app/api/`)

8 route files trimmed by extracting adjacent helper modules:

- `sessions/route.ts` → `sessionHandlers.ts`, `sessionSchemas.ts`, `mapSessionItem.ts`, `extractWordCount.ts`
- `sessions/[id]/complete/route.ts` → `completeHelpers.ts`
- `metrics/trends/route.ts` → `trendsQuery.ts`
- `drills/[id]/complete/route.ts` → `drillCompleteHelpers.ts`
- `fluency-sessions/[id]/rounds/route.ts` → `roundsHelpers.ts`
- `users/me/daily-summaries/route.ts` → `route.helpers.ts`
- `users/me/reading-practice-sessions/route.ts` → `route.helpers.ts`
- `dev/process-final/route.ts` → `processFinalHelpers.ts`

### Pages (`src/app/`)

- `session/[id]/page.tsx` → `SessionStateViews.tsx`, `useSessionDoneViewModel.ts`, `useSessionPageData.ts`
- `history/page.tsx` → `HistoryDateFilter.tsx`, `HistorySessionList.tsx`
- `(public)/page.tsx` → `HomeHero.tsx` (+ `.types.ts`)
- `(public)/launch/LaunchContent.tsx` → `LaunchCountdown.tsx`, `LaunchPageBody.tsx`, `LaunchTokenModal.tsx` (+ `.types.ts` for each), `useLaunchValidation.ts`
- `(public)/explanation/ExplanationContent.tsx` → `ExplanationHero.tsx`, `ExplanationScrollSections.tsx` (+ `.types.ts`)

### Other

- `middleware.ts` → `middlewareHelpers.ts` extracted
- `prisma/seed.ts` → `prisma/seedData.ts` extracted
- `eslint.config.mjs` — suppression overrides removed now that source files comply

## Architecture Decisions

- **Co-location over reorganization** — New files are placed alongside their parent rather than in new subdirectories. This keeps related code spatially close and avoids churn to existing import paths.
- **Public APIs fully preserved** — Every component's props interface, every hook's return type, every route's request/response contract, and every barrel export is identical to before. No call site in the codebase required a change.
- **Types files expanded, not duplicated** — Where a component's `.types.ts` was undersized, related types were consolidated there rather than scattered across new files, keeping the 4-file component pattern intact.
- **Helpers named by responsibility** — Extracted files use descriptive suffixes (`Helpers`, `Query`, `Handlers`, `Schemas`, `Fetcher`, `Actions`, `Media`, `Flow`, `Api`) so their purpose is immediately clear without reading the implementation.

## Testing

- `npx tsc --noEmit` — exit 0, zero errors
- `npm run lint` (Next.js ESLint CI gate) — clean, zero complexity suppressions remain
- `npx vitest run` — **1,139 passed, 4 skipped, 145 test files**
- Zero behavior change — this is a structural refactor only

## Deployment Notes

- **No migrations required** — no schema changes.
- **No environment variable changes** — no new or removed env vars.
- **No runtime impact** — the refactor is purely structural. Bundle output, API behavior, and UI rendering are identical to v0.60.0.
- **Safe to deploy** — standard deploy, no rollback risk.

## Verification Checklist

- [ ] `npx tsc --noEmit` exits 0
- [ ] `npm run lint` exits 0 with zero warnings
- [ ] `npx vitest run` — 1,139 tests pass
- [ ] Recording flow works end-to-end (microphone capture → upload → pipeline)
- [ ] Session results page renders correctly
- [ ] Dashboard metrics display correctly
- [ ] Settings page loads and saves preferences
- [ ] Fluency training sessions start and progress correctly
