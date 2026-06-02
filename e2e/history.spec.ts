// E2E tests for session history page — list rendering and delete flow
import { test, expect } from './fixtures/auth';
import {
  cleanupDeletableSession,
  cleanupSeedData,
  seedCompletedSession,
  seedDeletableSession,
} from './fixtures/seed';

test.describe('History', () => {
  test('history page renders heading and resolves content', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/history');
    await expect(authenticatedPage).toHaveURL(/\/history/);
    await expect(
      authenticatedPage.getByRole('heading', { name: /activity/i }),
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
    await authenticatedPage.waitForLoadState('networkidle');
    await expect(authenticatedPage.getByText(/describing test scenarios/i)).toBeVisible({
      timeout: 20_000,
    });
  });
});

test.describe('history delete flow', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    await seedDeletableSession();
  });

  test.afterAll(async () => {
    // Cleanup in case the delete test did not remove it (e.g. cancel path)
    await cleanupDeletableSession();
  });

  test('delete button appears on hover and opens confirmation modal', async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto('/history');
    await authenticatedPage.waitForLoadState('networkidle');

    // Wait for the seeded session to appear
    const sessionLabel = authenticatedPage.getByText('session to be deleted', { exact: true });
    await expect(sessionLabel).toBeVisible({ timeout: 20_000 });

    // Hover the session card to reveal delete button (card has .group class)
    const cardContainer = authenticatedPage.locator('.group', { hasText: 'session to be deleted' }).first();
    await cardContainer.hover();

    // Delete button within this specific card becomes visible on hover
    const deleteButton = cardContainer.getByRole('button', {
      name: /delete session/i,
    });
    await expect(deleteButton).toBeVisible({ timeout: 5_000 });

    // Click delete to open modal
    await deleteButton.click();

    // Modal appears with confirmation text
    const modal = authenticatedPage.getByRole('alertdialog');
    await expect(modal).toBeVisible();
    await expect(modal.getByText('Delete this workout?', { exact: true })).toBeVisible();

    // Cancel button closes modal without deleting
    await modal.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(modal).toBeHidden();

    // Session still visible after cancel
    await expect(sessionLabel).toBeVisible();
  });

  test('confirming delete removes session and shows toast', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/history');
    await authenticatedPage.waitForLoadState('networkidle');

    // Wait for the seeded session to appear
    const sessionLabel = authenticatedPage.getByText('session to be deleted', { exact: true });
    await expect(sessionLabel).toBeVisible({ timeout: 20_000 });

    // Hover to reveal and click delete — scoped to the correct card
    const cardContainer = authenticatedPage.locator('.group', { hasText: 'session to be deleted' }).first();
    await cardContainer.hover();

    const deleteButton = cardContainer.getByRole('button', {
      name: /delete session/i,
    });
    await expect(deleteButton).toBeVisible({ timeout: 5_000 });
    await deleteButton.click();

    // Confirm deletion in modal
    const modal = authenticatedPage.getByRole('alertdialog');
    await expect(modal).toBeVisible();
    await modal.getByRole('button', { name: 'Delete', exact: true }).click();

    // Wait for modal to close (confirms API completed successfully)
    await expect(modal).toBeHidden({ timeout: 30_000 });

    // Session removed from list
    await expect(sessionLabel).toBeHidden({ timeout: 10_000 });

    // Toast notification appears
    await expect(authenticatedPage.getByText('Session deleted', { exact: true })).toBeVisible({
      timeout: 10_000,
    });
  });
});
