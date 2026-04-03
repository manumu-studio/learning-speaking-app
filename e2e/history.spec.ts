// E2E tests for session history page
import { test, expect } from './fixtures/auth';
import { cleanupSeedData, seedCompletedSession } from './fixtures/seed';

test.describe('History', () => {
  test('history page renders heading and resolves content', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/history');
    await expect(authenticatedPage).toHaveURL(/\/history/);
    await expect(
      authenticatedPage.getByRole('heading', { name: /session history/i }),
    ).toBeVisible();
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

test.describe('history with seeded session', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    await seedCompletedSession();
  });

  test.afterAll(async () => {
    await cleanupSeedData();
  });

  test('session list shows seeded session with intent label', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/history');
    await expect(authenticatedPage.getByText(/describing test scenarios/i)).toBeVisible({
      timeout: 10_000,
    });
  });
});
