# ENTRY-12 — Landing Page Sections

**Date:** 2026-03-31
**Type:** Feature
**Branch:** `feature/landing-page-sections`
**Version:** `0.12.0`

---

## What I Did

Turned the single-screen landing page into a full multi-section scrollable page. Built three new sections and a reusable scroll animation component:

- **ScrollReveal** — generic IntersectionObserver wrapper that fades content in on scroll. Respects `prefers-reduced-motion` so animations are skipped for users who opt out.
- **FeatureShowcase** — three glass-morphism cards highlighting the app's core capabilities: AI Speech Analysis, Pattern Detection, and Progress Tracking. Uses `lucide-react` icons.
- **HowItWorks** — a three-step visual flow (Record → AI Analyzes → Review) with numbered circles connected by a gradient line.
- **CtaFooter** — bottom call-to-action that shows "Get Started Free" for visitors and "Go to Dashboard" for signed-in users.

Also fixed the HeroCanvas (Three.js particle background) so it stays scoped to the hero section instead of covering the entire viewport. Changed from `fixed` to `absolute` positioning and switched the resize listener from `window` to the parent container.

Final layout order: Hero → Features → How It Works → CTA.

## Files Touched

| File | Action |
|------|--------|
| `package.json` | Added `lucide-react` |
| `src/app/(public)/page.tsx` | Multi-section layout, shared sign-in action |
| `src/components/ui/HeroCanvas/HeroCanvas.tsx` | Fixed positioning and resize scope |
| `src/components/ui/ScrollReveal/*` | New — 3 files |
| `src/components/landing/FeatureShowcase/*` | New — 3 files |
| `src/components/landing/HowItWorks/*` | New — 3 files |
| `src/components/landing/CtaFooter/*` | New — 3 files |

## Decisions

- **ScrollReveal as a shared primitive** rather than inlining IntersectionObserver in each section. It's generic enough that future sections can reuse it with zero effort.
- **`lucide-react` over heroicons** — tree-shakeable, smaller per-icon footprint, and the icon style fits the existing design language.
- **Single server action for sign-in** defined in `page.tsx` and passed down to both the hero and the CTA footer, avoiding duplication.
- **HeroCanvas scoped to parent** — the original `fixed` positioning worked fine for a single-screen page but broke the multi-section layout. Switching to `absolute` + parent-scoped resize was the minimal fix.

## Still Open

- Accessibility pass: sections use semantic HTML but could benefit from `aria-label` attributes on key sections.
- Rate limiting on the sign-in action (known debt from earlier versions).
- Mobile responsiveness fine-tuning — tested on desktop, but the glass cards and step flow may need breakpoint adjustments.

## Validation

- `npx tsc --noEmit` — passed
- `npm run build` — compiled, route `/` = 5.76 kB
- `npm run lint` — no warnings or errors
