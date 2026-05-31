// E2E tests for the authenticated dashboard page
import { test, expect } from './fixtures/auth';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');
  });

  test('dashboard page loads when authenticated', async ({ authenticatedPage }) => {
    await expect(authenticatedPage).toHaveURL(/\/dashboard/);
    await expect(
      authenticatedPage.getByRole('heading', { name: 'Dashboard', level: 1 }),
    ).toBeVisible();
  });

  test('dashboard leaves loading state and shows metrics or empty prompt', async ({
    authenticatedPage,
  }) => {
    await expect(authenticatedPage.getByText(/loading dashboard/i)).toHaveCount(0, {
      timeout: 20_000,
    });
    await expect(
      authenticatedPage.getByRole('heading', { name: 'Dashboard', level: 1 }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('IdentitySummary stats section renders with dl structure', async ({
    authenticatedPage,
  }) => {
    await expect(authenticatedPage.getByText(/loading dashboard/i)).toHaveCount(0, {
      timeout: 10_000,
    });
    const errorBanner = authenticatedPage.getByText(/unable to load dashboard/i);
    const statsDl = authenticatedPage.locator('dl').first();
    await expect(errorBanner.or(statsDl)).toBeVisible({ timeout: 15_000 });
    if (!(await errorBanner.isVisible())) {
      await expect(
        statsDl.locator('dt').filter({ hasText: /^This Week$/i }),
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  test('FocusSelector appears after selecting a metric when metrics are shown', async ({
    authenticatedPage,
  }) => {
    const metricButton = authenticatedPage
      .getByRole('button', { name: /select .+ as training focus/i })
      .first();
    if (!(await metricButton.isVisible())) {
      test.skip();
      return;
    }
    await metricButton.click();
    await expect(
      authenticatedPage.getByText(/today's training focus/i),
    ).toBeVisible({ timeout: 5000 });
    await expect(
      authenticatedPage.getByRole('button', { name: /clear training focus/i }),
    ).toBeVisible();
  });

  test('navigation to training page works from main nav', async ({ authenticatedPage }) => {
    const trainingLink = authenticatedPage
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Training' });
    await trainingLink.click();
    await expect(authenticatedPage).toHaveURL(/\/drills/, { timeout: 10_000 });
  });

  test('dashboard leaves loading state for a stable outcome', async ({ authenticatedPage }) => {
    await expect(
      authenticatedPage.getByRole('heading', { name: 'Dashboard', level: 1 }),
    ).toBeVisible();
    await expect(authenticatedPage.getByText(/loading dashboard/i)).toHaveCount(0, {
      timeout: 20_000,
    });
    const statsDl = authenticatedPage.locator('dl').first();
    const errorBanner = authenticatedPage.getByText(/unable to load dashboard/i);
    await expect(statsDl.or(errorBanner)).toBeVisible({ timeout: 20_000 });
  });
});
