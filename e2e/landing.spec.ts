// E2E tests for the public landing page (dev server uses E2E_TEST_USER — authenticated hero CTA)
import { test, expect } from '@playwright/test';
import { gotoAppPage } from './navigation';
import { e2eTimeout } from './timeouts';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAppPage(page, '/');
  });

  test('loads with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Learning Speaking App/i);
  });

  test('hero section is visible with primary CTA', async ({ page }) => {
    await expect(page.getByRole('region', { name: /hero/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'LEARNING', level: 1 })).toBeVisible();
    // With E2E_TEST_USER the hero shows session CTA instead of sign-in form
    const sessionCta = page.getByRole('button', { name: /go to dashboard/i });
    const signInCta = page.getByRole('button', { name: /sign in with manumustudio/i });
    await expect(sessionCta.or(signInCta).first()).toBeVisible();
  });

  test('dark mode toggle switches aria-label when clicked', async ({ page }) => {
    const toggle = page.getByRole('button', { name: /switch to (light|dark) mode/i }).first();
    await expect(toggle).toBeVisible();
    const before = await toggle.getAttribute('aria-label');
    await toggle.click();
    const after = await toggle.getAttribute('aria-label');
    expect(after).not.toEqual(before);
  });

  test('skip link is present and can be focused', async ({ page }) => {
    const skip = page.getByRole('link', { name: /skip to main content/i });
    await expect(skip).toBeAttached();
    await skip.focus();
    await expect(skip).toBeFocused();
  });

  test('primary CTA navigates toward the app session flow', async ({ page }) => {
    // Hero CTA renders as a button (NavButton) when authenticated, link when not
    const sessionCta = page.getByRole('button', { name: /go to dashboard/i });
    const signInCta = page.getByRole('button', { name: /sign in with manumustudio/i });
    await expect(sessionCta.or(signInCta).first()).toBeVisible({
      timeout: e2eTimeout(15_000),
    });

    if (await sessionCta.isVisible()) {
      // The CTA is a client NavButton whose onClick→router.push is only wired after
      // hydration, and its target (/session/new) is a protected route that can
      // cold-redirect back to / before the test session is ready. Assert the landing
      // page's own responsibility — that clicking *initiates* the session-flow
      // transition — rather than coupling to auth/route timing. NavButton sets its
      // loading state synchronously on click and holds it until the route unmounts,
      // so the "Loading…" button is a stable proof the navigation fired. The completed
      // /session/new load is covered by session.spec.ts. (See INCIDENT-E2E-LANDING-CTA.)
      await expect(async () => {
        await sessionCta.click();
        await expect(page.getByRole('button', { name: /loading/i })).toBeVisible({
          timeout: 1_000,
        });
      }).toPass({ timeout: e2eTimeout(15_000) });
    }
  });

  test('cookie consent banner appears on first visit to the app', async ({ page }) => {
    const banner = page.getByRole('banner', { name: /cookie consent/i });
    await expect(banner).toBeVisible({ timeout: e2eTimeout(10_000) });
    await expect(banner.getByRole('button', { name: /^accept$/i })).toBeVisible();
  });
});
