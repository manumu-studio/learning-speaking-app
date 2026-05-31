# PR-0.53.0 — Recording & Navigation UX
**Branch:** `feat/recording-navigation-ux` → `main`
**Version:** `0.53.0`
**Date:** 2026-05-31
**Status:** ✅ Ready to merge
---
## Summary
Mobile-first navigation overhaul: bottom tab bar for primary actions, slide-up sheet for secondary nav, collapsible prompt categories with memory, hero recording layout, and collapsed session detail sections.

## Files Changed
| File | Action | Notes |
|------|--------|-------|
| `src/components/ui/BottomTabBar/` | Created | 4-tab mobile navigation (Home, Record, History, More) |
| `src/components/ui/MoreSheet/` | Created | Secondary nav sheet (Prompts, Trends, Training, Settings) |
| `src/components/ui/MobileNav/` | Created | Client wrapper for nav state |
| `src/components/ui/TopBar/TopBar.tsx` | Modified | Conditional visibility on mobile |
| `src/features/recording/PromptCard/PromptCard.tsx` | Modified | Collapsible categories + localStorage persistence |
| `src/features/recording/RecordingPanel/RecordingPanel.tsx` | Modified | Hero button layout, level overlay |
| `src/app/(app)/layout.tsx` | Modified | MobileNav integration |
| `src/app/(app)/session/[id]/page.tsx` | Modified | Default-collapsed sections |

## Architecture Decisions
| Decision | Why |
|----------|-----|
| 4-tab bottom bar (not 5) | Thumb-zone best practice — More sheet holds overflow |
| MoreSheet instead of sidebar drawer | Matches native iOS/Android patterns for secondary nav |
| localStorage for prompt category | Lightweight persistence without API call; category is UI-only state |

## Testing Checklist
- [ ] Mobile (375px): bottom tab bar visible, top bar hidden
- [ ] Desktop (1024px+): top bar visible, bottom tab bar hidden
- [ ] Tap More tab — sheet slides up with 4 secondary items
- [ ] Select prompt category — collapses, persists on reload
- [ ] Record button fills viewport center on mobile
- [ ] Session detail page — sections collapsed by default, expandable
- [ ] Dark mode: all new components render correctly

## Deployment Notes
UI-only deploy — no migrations, no new API routes.

## Validation
```
npx tsc --noEmit → exit 0
npm run lint → no warnings
npm test -- --run → 790 passed | 70.09% coverage
npm run build → compiled successfully
```
