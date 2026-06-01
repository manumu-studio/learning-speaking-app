# Prompts Feature

> Provides the speaking prompt library — a filterable grid of categorized prompts that users can select before recording.

## Responsibilities
- Rendering the full prompt library with category tab filters
- Displaying a pre-selected prompt as a banner above the recording UI
- Presenting individual prompt cards with topic, category, and a "Start recording" action

## Key Modules
| File / Folder | Purpose |
|---------------|---------|
| `PromptLibraryView/` | Filterable grid view; manages active category tab state client-side |
| `LibraryPromptCard/` | Individual prompt card component — displays prompt text, category, and CTA |
| `PromptBanner/` | Compact banner shown above the recorder when a prompt is pre-selected |

## Data Flow
- `PromptLibraryView` receives `prompts` and `categories` as props (fetched server-side from `lib/prompts/promptLibrary`).
- Category filtering is managed locally with `useState`; no API calls from this feature.
- Selecting a prompt navigates to the recording page with the prompt encoded in the URL, where `PromptBanner` picks it up and displays it.

## Conventions
- 4-file component pattern; types in `.types.ts`; barrel exports via `index.ts`.
- Prompt library data (`lib/prompts/`) is owned outside this feature; this domain only handles the UI layer.
