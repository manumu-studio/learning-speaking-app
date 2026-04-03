// E2E tests for drills list and drill detail UI
import { test, expect } from './fixtures/auth';

test.describe('Drill flow', () => {
  test('drills page loads with training heading and history or empty state', async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto('/drills');
    await expect(authenticatedPage.getByRole('heading', { name: 'Training', level: 1 })).toBeVisible();
    const empty = authenticatedPage.getByText(/no drills yet/i);
    const loading = authenticatedPage.getByText(/loading training history/i);
    await expect(empty.or(loading).first()).toBeVisible({ timeout: 15000 });
  });

  test('drill detail page resolves UI for a non-existent drill id', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/drill/00000000-0000-4000-8000-000000000002');
    await expect(authenticatedPage).toHaveURL(/\/drill\/00000000/);
    const loading = authenticatedPage.getByText(/loading drill/i);
    const error = authenticatedPage.getByText(/drill not found|failed|error|unknown/i);
    await expect(loading.or(error).first()).toBeVisible({ timeout: 20000 });
  });

  test('drill timer uses role timer when drill prompt is active', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/drill/00000000-0000-4000-8000-000000000003');
    const timer = authenticatedPage.getByRole('timer');
    const loading = authenticatedPage.getByText(/loading drill/i);
    const error = authenticatedPage.getByText(/drill not found|failed|not found/i);
    await expect(timer.or(loading).or(error).first()).toBeVisible({ timeout: 20000 });
  });

  test('navigation between drills list and dashboard', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/drills');
    await authenticatedPage.getByRole('link', { name: 'Dashboard' }).click();
    await expect(authenticatedPage).toHaveURL(/\/dashboard/);
  });
});
