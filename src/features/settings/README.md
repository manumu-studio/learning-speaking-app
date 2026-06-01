# Settings Feature

> Provides the user settings page and a hook for fetching and updating preferences with optimistic UI.

## Responsibilities
- Fetching user settings from `/api/users/me/settings`
- Updating individual settings with optimistic state and server rollback on failure
- Syncing the active theme (`light` / `dark` / `system`) with `next-themes`
- Rendering the settings page UI (daily goal, default duration, pronunciation toggle, theme, phoneme alphabet)

## Key Modules
| File / Folder | Purpose |
|---------------|---------|
| `useSettings.ts` | Fetches settings, exposes `updateSetting<K>()` with optimistic update and Zod validation |
| `SettingsPage/` | Full settings page component — renders all preference controls |

## Data Flow
- `useSettings` GETs `/api/users/me/settings` on mount and validates with a Zod schema.
- `updateSetting` PATCHes `/api/users/me/settings` optimistically; reverts on error.
- Theme changes are applied immediately via `useTheme` from `next-themes`.

## Conventions
- 4-file component pattern; types in `.types.ts`; barrel export via `index.ts`.
- Settings keys are derived from `UserSettings` via `keyof Omit<…>` — no stringly-typed keys.
