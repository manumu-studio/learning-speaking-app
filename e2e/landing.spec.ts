// E2E tests for the public landing page (dev server uses E2E_TEST_USER — authenticated hero CTA)
import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
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
    const sessionCta = page.getByRole('button', { name: /go to dashboard/i });
    const signInCta = page.getByRole('button', { name: /sign in with manumustudio/i });
    await expect(sessionCta.or(signInCta).first()).toBeVisible({ timeout: 10_000 });

    if (await sessionCta.isVisible()) {
      await sessionCta.click();
      await expect(page).toHaveURL(/\/dashboard|\/session\/new/, { timeout: 10_000 });
    }
  });

  test('cookie consent banner appears on first visit to the app', async ({ page }) => {
    const banner = page.getByRole('banner', { name: /cookie consent/i });
    await expect(banner).toBeVisible({ timeout: 10000 });
    await expect(banner.getByRole('button', { name: /^accept$/i })).toBeVisible();
  });
});
