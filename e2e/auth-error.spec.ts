// E2E tests for the authentication error page
import { test, expect } from '@playwright/test';

test.describe('auth error page', () => {
  test('displays error message from query parameter', async ({ page }) => {
    await page.goto('/auth/error?error=OAuthCallbackError');
    await expect(page.getByRole('heading', { name: /authentication error/i })).toBeVisible();
    await expect(page.getByText('OAuthCallbackError')).toBeVisible();
  });

  test('displays default error when no query param', async ({ page }) => {
    await page.goto('/auth/error');
    await expect(page.getByRole('heading', { name: /authentication error/i })).toBeVisible();
    await expect(page.getByText('Unknown error')).toBeVisible();
  });

  test('shows try again link back to sign in', async ({ page }) => {
    await page.goto('/auth/error?error=TestError');
    const tryAgainLink = page.getByRole('link', { name: /try again/i });
    await expect(tryAgainLink).toBeVisible();
    await expect(tryAgainLink).toHaveAttribute('href', /signin/);
  });
});
