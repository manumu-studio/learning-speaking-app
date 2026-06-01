# Recording Feature

> Owns the full client-side audio capture pipeline — state machine, AudioWorklet PCM capture, chunked upload to R2, silence detection, and recording UI components.

## Responsibilities
- Finite-state machine governing recording lifecycle (`idle → recording → validating → stopped`)
- AudioWorklet-based PCM capture with 120s chunks and 5s overlap; ScriptProcessor fallback for unsupported browsers
- WAV encoding via a dedicated Web Worker (`wav-chunker.worker.ts`)
- Chunked presign → R2 PUT → enqueue flow managed by `useChunkUploader`
- Voice Activity Detection via Silero VAD (`useSileroVad`) and a simpler amplitude-based fallback (`useSilenceDetector`)
- Recording validation (min/max duration, VAD warnings)
- Waveform visualization
- Mobile recording path (`useMobileRecording`) using the MediaRecorder API
- Shared React context (`RecordingContext`) exposing recorder state to child components
- Prompt display and time-limit selection within the recording UI

## Key Modules
| File / Folder | Purpose |
|---------------|---------|
| `recordingStateMachine.ts` | Pure reducer for state transitions; no side effects |
| `recordingState.types.ts` | Discriminated union types for all machine states and actions |
| `useAudioWorklet.ts` | Orchestrates AudioWorklet capture, chunk emission, and browser compat detection |
| `useChunkUploader.ts` | Manages chunked session lifecycle — presign, R2 PUT, enqueue, session completion |
| `useSileroVad.ts` | Silero ONNX model integration for voice activity detection |
| `useSilenceDetector.ts` | Amplitude-based silence detection fallback |
| `useMobileRecording.ts` | MediaRecorder-based path for mobile browsers |
| `useProgressiveResults.ts` | Polls for partial results while audio is still being processed |
| `useAiDisclosure.ts` | Manages AI processing disclosure acknowledgement state |
| `validateRecording.ts` | Duration and content validation before upload |
| `RecordingContext/` | React context + `useRecordingContext` hook exposing recorder state |
| `RecordingPanel/` | Main recording screen — timer, controls, waveform |
| `AudioPreviewPanel/` | Playback panel shown after recording stops |
| `WaveformVisualizer/` | Canvas-based real-time waveform animation |
| `PromptCard/` | Displays the active speaking prompt during recording |
| `TimeLimitSelector/` | UI for selecting the recording time limit |
| `prompts.config.ts` | Static prompt configuration for the recording screen |
| `workers/wav-chunker.worker.ts` | Web Worker — encodes raw PCM into WAV chunks |

## Data Flow
- User initiates recording → `useAudioWorklet` captures PCM → `wav-chunker.worker` encodes WAV chunks.
- Each completed chunk triggers `useChunkUploader`: presign via `/api/sessions/presign`, PUT to R2, enqueue via `/api/sessions/enqueue`.
- On stop: `validateRecording` checks duration and VAD → state transitions to `stopped`.
- Single-blob recording path (non-chunked) uploads via `useUploadSession` (owned by the `session` domain).

## Conventions
- 4-file component pattern; types in `.types.ts`; barrel exports via `index.ts`.
- No audio processing code in component files — all capture logic lives in dedicated hooks.
- `'use client'` on all hooks that touch browser APIs.
