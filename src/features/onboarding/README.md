# Onboarding Feature

> Guides new users through a three-step flow — welcome screen, voice recording, and initial voice profile results.

## Responsibilities
- Orchestrating the welcome → recording → results step sequence
- Collecting a short voice sample from new users via the onboarding recorder
- Displaying the initial voice profile after the first session is processed

## Key Modules
| File / Folder | Purpose |
|---------------|---------|
| `OnboardingFlow/` | Orchestrator component; manages `OnboardingStep` state and renders the correct sub-step |
| `OnboardingWelcome/` | Welcome screen with a "Get started" CTA |
| `OnboardingRecorder/` | Recording UI scoped to onboarding; `useOnboardingRecorder` handles audio capture and session submission |
| `VoiceProfile/` | Displays the processed voice profile after the first recording; `useVoiceProfile` polls for session completion |
| `index.ts` | Barrel export |

## Data Flow
- `OnboardingFlow` reads an optional `session` search param to resume at the results step.
- On recording completion, `OnboardingRecorder` submits audio, receives a `sessionId`, and advances to `VoiceProfile`.
- `VoiceProfile` polls `/api/sessions/:id` until the session status is `DONE`, then displays the initial metrics.

## Conventions
- 4-file component pattern; types in `.types.ts`; barrel exports via `index.ts`.
- `OnboardingRecorder` is dynamically imported (SSR disabled) due to browser audio APIs.
