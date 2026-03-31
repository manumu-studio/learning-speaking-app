# PR-0.12.0 — Landing Page Sections

**Branch:** `feature/landing-page-sections` → `main`
**Version:** `0.12.0`
**Date:** 2026-03-31
**Status:** ✅ Ready to merge

---

## Summary

Expands the landing page from a single hero screen into a full multi-section scrollable page. Adds three new sections (FeatureShowcase, HowItWorks, CtaFooter) and a reusable scroll animation wrapper. Fixes HeroCanvas positioning to stay within the hero section.

## Files Changed

| File | Action | Notes |
|------|--------|-------|
| `package.json` | Modified | Added `lucide-react` dependency |
| `src/app/(public)/page.tsx` | Modified | Multi-section layout, shared sign-in server action, removed studio attribution |
| `src/components/ui/HeroCanvas/HeroCanvas.tsx` | Modified | `fixed` → `absolute` positioning, parent-scoped resize |
| `src/components/ui/ScrollReveal/ScrollReveal.tsx` | Created | IntersectionObserver wrapper with `prefers-reduced-motion` support |
| `src/components/ui/ScrollReveal/ScrollReveal.types.ts` | Created | Props interface |
| `src/components/ui/ScrollReveal/index.ts` | Created | Barrel export |
| `src/components/landing/FeatureShowcase/FeatureShowcase.tsx` | Created | Three glass-morphism feature cards with lucide-react icons |
| `src/components/landing/FeatureShowcase/FeatureShowcase.types.ts` | Created | Props interface |
| `src/components/landing/FeatureShowcase/index.ts` | Created | Barrel export |
| `src/components/landing/HowItWorks/HowItWorks.tsx` | Created | Three-step visual flow with numbered circles and gradient connector |
| `src/components/landing/HowItWorks/HowItWorks.types.ts` | Created | Props interface |
| `src/components/landing/HowItWorks/index.ts` | Created | Barrel export |
| `src/components/landing/CtaFooter/CtaFooter.tsx` | Created | Auth-conditional CTA (sign in vs. dashboard) |
| `src/components/landing/CtaFooter/CtaFooter.types.ts` | Created | Props interface |
| `src/components/landing/CtaFooter/index.ts` | Created | Barrel export |

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| ScrollReveal as shared `ui/` component | Reusable IntersectionObserver primitive — any future section can use it without reimplementing |
| `prefers-reduced-motion` support | Accessibility — animations are skipped entirely for users who opt out |
| Single `handleSignIn` server action | Defined once in `page.tsx`, passed to hero and CTA footer — avoids duplication |
| HeroCanvas `fixed` → `absolute` | Required for multi-section layout — canvas was covering sections below the hero |
| `lucide-react` for icons | Tree-shakeable, lightweight, consistent style with existing UI |

## Testing Checklist

- [ ] Landing page loads with all four sections visible on scroll
- [ ] ScrollReveal animations trigger on first scroll into view
- [ ] Animations are skipped when `prefers-reduced-motion: reduce` is enabled in OS settings
- [ ] HeroCanvas particle background stays within the hero section and does not overlay other sections
- [ ] "Get Started Free" button triggers OAuth sign-in flow (unauthenticated)
- [ ] "Go to Dashboard" button navigates to `/dashboard` (authenticated)
- [ ] Feature cards display correct icons (Mic, Brain, TrendingUp)
- [ ] HowItWorks steps show connecting gradient line between numbered circles
- [ ] Page is scrollable on mobile viewports
- [ ] `npm run build` passes with no errors

## Deployment Notes

- New dependency: `lucide-react` — will be installed automatically via `npm install` during build.
- No new environment variables required.
- No database changes.
- No middleware changes.

## Validation

- `npx tsc --noEmit` — ✅ passed
- `npm run build` — ✅ compiled, all pages generated, route `/` = 5.76 kB
- `npm run lint` — ✅ no warnings or errors
