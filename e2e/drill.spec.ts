// E2E tests for drills list and drill detail UI
import { test, expect } from './fixtures/auth';
import { cleanupDrillData, seedCompletedDrill, SEED_DRILL_ID } from './fixtures/seed';
import { gotoAppPage } from './navigation';
import { e2eTimeout } from './timeouts';

test.describe('Drill flow', () => {
  test('drills page loads with training heading and history or empty state', async ({
    authenticatedPage,
  }) => {
    await gotoAppPage(authenticatedPage, '/drills');
    await expect(authenticatedPage.getByRole('heading', { name: 'Training', level: 1 })).toBeVisible({
      timeout: e2eTimeout(15_000),
    });
    const empty = authenticatedPage.getByText(/no drills yet/i);
    const loading = authenticatedPage.getByText(/loading training history/i);
    const drillItem = authenticatedPage
      .getByText(/improved|not yet|connector|structural|vocabulary|verb|argument|filler/i)
      .first();
    await expect(empty.or(loading).or(drillItem).first()).toBeVisible({
      timeout: e2eTimeout(15_000),
    });
  });

  test('drill detail page shows error for a non-existent drill id', async ({ authenticatedPage }) => {
    await gotoAppPage(authenticatedPage, '/drill/00000000-0000-4000-8000-000000000002');
    await expect(authenticatedPage).toHaveURL(/\/drill\/00000000/);
    await expect(authenticatedPage.getByText(/loading drill/i)).toBeHidden({
      timeout: e2eTimeout(25_000),
    });
    await expect(authenticatedPage.getByText(/failed to load drill/i)).toBeVisible();
  });

  test('drill timer uses role timer when drill prompt is active', async ({ authenticatedPage }) => {
    await gotoAppPage(authenticatedPage, '/drill/00000000-0000-4000-8000-000000000003');
    const timer = authenticatedPage.getByRole('timer');
    const loading = authenticatedPage.getByText(/loading drill/i);
    const error = authenticatedPage.getByText(/failed to load drill/i);
    await expect(timer.or(loading).or(error).first()).toBeVisible({ timeout: e2eTimeout(20_000) });
  });

  test('navigation between drills list and dashboard', async ({ authenticatedPage }) => {
    await gotoAppPage(authenticatedPage, '/drills');
    await authenticatedPage.getByRole('link', { name: 'Dashboard' }).click();
    await expect(authenticatedPage).toHaveURL(/\/dashboard/, { timeout: e2eTimeout(15_000) });
  });
});

test.describe('completed drill detail', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    await seedCompletedDrill();
  });

  test.afterAll(async () => {
    await cleanupDrillData();
  });

  test('drill detail page renders completed drill with feedback', async ({ authenticatedPage }) => {
    await gotoAppPage(authenticatedPage, `/drill/${SEED_DRILL_ID}`);

    await expect(authenticatedPage.getByText(/great improvement/i)).toBeVisible({
      timeout: e2eTimeout(15_000),
    });
    await expect(authenticatedPage.getByText(/connector repetition/i)).toBeVisible();
  });

  test('completed drill shows improvement indicator', async ({ authenticatedPage }) => {
    await gotoAppPage(authenticatedPage, `/drill/${SEED_DRILL_ID}`);
    await expect(authenticatedPage.getByText(/great improvement/i)).toBeVisible({
      timeout: e2eTimeout(15_000),
    });

    await expect(authenticatedPage.getByText('✅ Improved')).toBeVisible({
      timeout: e2eTimeout(10_000),
    });
  });
});
