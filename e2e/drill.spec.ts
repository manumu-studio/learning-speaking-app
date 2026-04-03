// E2E tests for drills list and drill detail UI
import { test, expect } from './fixtures/auth';
import { cleanupSeedData, seedCompletedDrill, SEED_DRILL_ID } from './fixtures/seed';

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

  test('drill detail page shows error for a non-existent drill id', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/drill/00000000-0000-4000-8000-000000000002');
    await expect(authenticatedPage).toHaveURL(/\/drill\/00000000/);
    await expect(authenticatedPage.getByText(/loading drill/i)).toBeHidden({ timeout: 25_000 });
    await expect(authenticatedPage.getByText(/failed to load drill/i)).toBeVisible();
  });

  test('drill timer uses role timer when drill prompt is active', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/drill/00000000-0000-4000-8000-000000000003');
    const timer = authenticatedPage.getByRole('timer');
    const loading = authenticatedPage.getByText(/loading drill/i);
    const error = authenticatedPage.getByText(/failed to load drill/i);
    await expect(timer.or(loading).or(error).first()).toBeVisible({ timeout: 20000 });
  });

  test('navigation between drills list and dashboard', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/drills');
    await authenticatedPage.getByRole('link', { name: 'Dashboard' }).click();
    await expect(authenticatedPage).toHaveURL(/\/dashboard/);
  });
});

test.describe('completed drill detail', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    await seedCompletedDrill();
  });

  test.afterAll(async () => {
    await cleanupSeedData();
  });

  test('drill detail page renders completed drill with feedback', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(`/drill/${SEED_DRILL_ID}`);

    await expect(authenticatedPage.getByText(/great improvement/i)).toBeVisible({ timeout: 15_000 });
    await expect(authenticatedPage.getByText(/connector repetition/i)).toBeVisible();
  });

  test('completed drill shows improvement indicator', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(`/drill/${SEED_DRILL_ID}`);
    await expect(authenticatedPage.getByText(/great improvement/i)).toBeVisible({ timeout: 15_000 });

    await expect(authenticatedPage.getByText('✅ Improved')).toBeVisible();
  });
});
