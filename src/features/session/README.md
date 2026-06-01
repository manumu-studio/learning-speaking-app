# Session Feature

> Manages speaking session lifecycle — uploading, polling for status, tracking processing state across the app, and updating the user's speech pattern profile.

## Responsibilities
- Uploading a recorded audio blob to create a new session (`useUploadSession`)
- Polling `/api/sessions/:id` until a session reaches terminal status (`useSessionStatus`)
- Tracking multiple concurrently processing sessions across the app via React context (`ProcessingSessionsContext`)
- Fetching the user's session history list (`useSessionHistory`)
- Aggregating speech pattern insights into the `PatternProfile` database record (`updatePatternProfile`)
- Collecting user feedback on a completed session (`RegisterFeedback`)

## Key Modules
| File / Folder | Purpose |
|---------------|---------|
| `useUploadSession.ts` | POSTs audio blob to `/api/sessions/upload`; returns `sessionId` and estimated wait |
| `useSessionStatus.ts` | Polls session status; resolves through `CREATED → UPLOADED → … → DONE \| FAILED` |
| `useSessionHistory.ts` | Fetches paginated session history from `/api/sessions` |
| `ProcessingSessionsContext/` | Context + `useProcessingSessions` — maintains a set of in-flight session IDs app-wide |
| `updatePatternProfile.ts` | Server utility — upserts `PatternProfile` with frequency-counted pattern insights |
| `RegisterFeedback/` | UI component for submitting a thumbs-up/down on a completed session |
| `SessionCardSkeleton.tsx` | Loading skeleton for session list cards |

## Data Flow
- After recording stops, the `recording` feature triggers `useUploadSession`.
- The returned `sessionId` is added to `ProcessingSessionsContext` and polled via `useSessionStatus`.
- When status reaches `DONE`, the results page renders metric scores and coaching insights.
- `updatePatternProfile` is called server-side (in pipeline handlers) after analysis completes.

## Conventions
- 4-file component pattern; types in `.types.ts`; barrel exports via `index.ts`.
- All API responses validated with Zod before use.
- Session status is a string union — `CREATED | UPLOADED | CHUNKS_PROCESSING | AWAITING_FINAL | PROCESSING_FINAL | TRANSCRIBING | SCORING | ANALYZING | DONE | FAILED | CANCELLED`.
