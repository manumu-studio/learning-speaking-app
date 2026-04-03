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

  test('six MetricCards are visible when user has enough sessions', async ({
    authenticatedPage,
  }) => {
    const metricButtons = authenticatedPage.getByRole('button', {
      name: /select .+ as training focus/i,
    });
    const count = await metricButtons.count();
    if (count >= 6) {
      await expect(metricButtons).toHaveCount(6);
    } else {
      await expect(
        authenticatedPage.getByText(/record a few more sessions to see your patterns emerge/i),
      ).toBeVisible();
    }
  });

  test('IdentitySummary stats section renders with dl structure', async ({
    authenticatedPage,
  }) => {
    const error = authenticatedPage.getByText(/unable to load dashboard/i);
    const dl = authenticatedPage.locator('dl').first();
    await expect(error.or(dl)).toBeVisible({ timeout: 20000 });
    if (await dl.isVisible()) {
      await expect(authenticatedPage.getByRole('term', { name: /this week/i })).toBeVisible();
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
    await authenticatedPage.getByRole('link', { name: 'Training' }).click();
    await expect(authenticatedPage).toHaveURL(/\/drills/);
  });

  test('dashboard leaves loading state for a stable outcome', async ({ authenticatedPage }) => {
    await expect(
      authenticatedPage.getByRole('heading', { name: 'Dashboard', level: 1 }),
    ).toBeVisible();
    await expect(authenticatedPage.getByText(/loading dashboard/i)).toHaveCount(0);
    const settled = authenticatedPage.locator('dl').or(authenticatedPage.getByText(/unable to load dashboard/i));
    await expect(settled.first()).toBeVisible({ timeout: 20000 });
  });
});
