// E2E tests for the launch page (public)
import { test, expect } from '@playwright/test';

test.describe('launch page', () => {
  test('launch page loads successfully', async ({ page }) => {
    await page.goto('/launch');
    await expect(page).toHaveTitle(/LSA.*ManuMu/i);
  });

  test('launch page is accessible without authentication', async ({ page }) => {
    await page.goto('/launch');
    await expect(page).toHaveURL(/\/launch/);
  });
});
