// E2E auth fixture -- provides authenticated context when E2E_TEST_USER is set on the dev server
// Approach: Mock auth via E2E_TEST_USER (Option B) because OIDC + PKCE against the external auth
// server is too brittle for E2E. `src/features/auth/auth.ts` returns a synthetic session when
// E2E_TEST_USER is set and NODE_ENV is not production; middleware skips API rate limiting for the
// same flag so E2E traffic is not throttled.
import { test as base, type Page } from '@playwright/test';

export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    await use(page);
  },
});

export { expect } from '@playwright/test';
