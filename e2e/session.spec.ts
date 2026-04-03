// E2E tests for session-related pages — UI and navigation only (no full recording)
import { test, expect } from './fixtures/auth';

test.describe('Session flow', () => {
  test('new session page loads with recording UI', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/session/new');
    await expect(
      authenticatedPage.getByRole('heading', { name: /new speaking session/i }),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByRole('button', { name: /start recording/i }),
    ).toBeVisible();
  });

  test('session history page shows heading and empty or list state', async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto('/history');
    await expect(
      authenticatedPage.getByRole('heading', { name: /session history/i }),
    ).toBeVisible();
    const empty = authenticatedPage.getByText(/no sessions yet/i);
    const loading = authenticatedPage.getByRole('status', { name: /loading sessions/i });
    const settled = empty.or(authenticatedPage.getByRole('link', { name: /new session/i }));
    await expect(loading.or(settled).first()).toBeVisible({ timeout: 15000 });
  });

  test('session detail page loads main content for a placeholder id', async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto('/session/00000000-0000-4000-8000-000000000001');
    await expect(authenticatedPage).toHaveURL(/\/session\/00000000/);
    await expect(authenticatedPage.locator('#main-content')).toBeVisible({ timeout: 15000 });
  });

  test('navigation between new session and history via main nav', async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto('/session/new');
    await authenticatedPage.getByRole('link', { name: 'History' }).click();
    await expect(authenticatedPage).toHaveURL(/\/history/);
    await authenticatedPage.getByRole('link', { name: 'New Session' }).click();
    await expect(authenticatedPage).toHaveURL(/\/session\/new/);
  });
});
