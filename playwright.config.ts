// Playwright E2E test configuration -- runs against an isolated local server
import { defineConfig, devices } from '@playwright/test';

const IS_CI = Boolean(process.env.CI);
const E2E_PORT = process.env.PLAYWRIGHT_PORT ?? (IS_CI ? '3000' : '3100');
const E2E_BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${E2E_PORT}`;
const E2E_READY_URL = `${E2E_BASE_URL}/api/health`;

/** Env passed to the dev server subprocess (strings only; Playwright requires Record<string, string>). */
function webServerEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      out[key] = value;
    }
  }
  out.APP_URL = E2E_BASE_URL;
  out.E2E_TEST_USER = 'true';
  out.NEXTAUTH_URL = E2E_BASE_URL;
  out.PORT = E2E_PORT;
  return out;
}

export default defineConfig({
  globalSetup: './e2e/global-setup.ts',
  testDir: './e2e',
  timeout: IS_CI ? 30_000 : 120_000,
  fullyParallel: true,
  forbidOnly: IS_CI,
  retries: IS_CI ? 2 : 0,
  workers: 1,
  reporter: IS_CI ? 'github' : 'html',
  expect: {
    timeout: IS_CI ? 5_000 : 45_000,
  },
  use: {
    baseURL: E2E_BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // Webpack dev (not Turbopack) — avoids per-route cold-compile flakes; same server locally and in CI.
    command: `npm run dev:e2e -- --port ${E2E_PORT}`,
    url: E2E_READY_URL,
    // Local E2E uses a dedicated port so manually running `npm run dev` on 3000 cannot affect tests.
    reuseExistingServer: false,
    // Keep local E2E in dev mode because synthetic auth bypass is disabled in production NODE_ENV.
    timeout: IS_CI ? 120_000 : 180_000,
    env: webServerEnv(),
  },
});
