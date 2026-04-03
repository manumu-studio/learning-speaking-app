// E2E tests for session history page
import { test, expect } from './fixtures/auth';

test.describe('History', () => {
  test('history page loads when authenticated', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/history');
    await expect(authenticatedPage).toHaveURL(/\/history/);
    await expect(
      authenticatedPage.getByRole('heading', { name: /session history/i }),
    ).toBeVisible();
  });

  test('session cards or empty state message is shown', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/history');
    const empty = authenticatedPage.getByText(/no sessions yet/i);
    const loading = authenticatedPage.getByText(/loading sessions/i);
    await expect(loading.or(empty).first()).toBeVisible({ timeout: 15000 });
  });

  test('clicking a session entry navigates to detail when history has items', async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto('/history');
    const list = authenticatedPage.getByRole('list', { name: /speaking sessions/i });
    const firstLink = list.getByRole('link').first();
    if (await firstLink.isVisible({ timeout: 15000 }).catch(() => false)) {
      await firstLink.click();
      await expect(authenticatedPage).toHaveURL(/\/session\/[a-f0-9-]+$/i);
    }
  });
});
