// E2E tests for session-related pages — UI and navigation only (no full recording)
import { test, expect } from './fixtures/auth';
import { cleanupSeedData, seedCompletedSession, SEED_SESSION_ID } from './fixtures/seed';

test.describe('Session flow', () => {
  test('new session page loads with recording UI', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/session/new');
    await expect(
      authenticatedPage.getByRole('heading', { name: /new speaking session/i }),
    ).toBeVisible();
    await expect(
      authenticatedPage.getByRole('button', { name: 'Start recording', exact: true }),
    ).toBeVisible();
  });

  test('session history page shows heading and empty or list state', async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto('/history');
    await expect(
      authenticatedPage.getByRole('heading', { name: /activity/i }),
    ).toBeVisible();
    const empty = authenticatedPage.getByText(/no sessions yet/i);
    const loading = authenticatedPage.getByRole('status', { name: /loading sessions/i });
    const settled = empty.or(authenticatedPage.getByRole('link', { name: /new session/i }));
    await expect(loading.or(settled).first()).toBeVisible({ timeout: 15000 });
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

test.describe('session detail with real data', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    await seedCompletedSession();
  });

  test.afterAll(async () => {
    await cleanupSeedData();
  });

  test('session detail page renders completed session results', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(`/session/${SEED_SESSION_ID}`);

    await expect(authenticatedPage.getByText(/session not found/i)).toHaveCount(0, {
      timeout: 15_000,
    });

    await expect(
      authenticatedPage.getByText(/testing strategies with good structural variety/i),
    ).toBeVisible({ timeout: 15_000 });

    await authenticatedPage.getByRole('button', { name: 'Show transcript', exact: true }).click();
    await expect(
      authenticatedPage.getByText(/test transcript for the e2e seeded session/i),
    ).toBeVisible();

    await expect(authenticatedPage.getByText(/argument closure/i)).toBeVisible();
  });

  test('session detail shows focus highlight when focusMetricKey is set', async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto(`/session/${SEED_SESSION_ID}`);
    await expect(
      authenticatedPage.getByText(/testing strategies with good structural variety/i),
    ).toBeVisible({ timeout: 15_000 });

    await expect(authenticatedPage.getByText(/focus area.*structural variety/i)).toBeVisible({
      timeout: 15_000,
    });
  });
});
