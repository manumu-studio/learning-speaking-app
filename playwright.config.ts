// Playwright E2E test configuration -- runs against local dev server
import { defineConfig, devices } from '@playwright/test';

/** Env passed to the dev server subprocess (strings only; Playwright requires Record<string, string>). */
function webServerEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      out[key] = value;
    }
  }
  out.E2E_TEST_USER = 'true';
  return out;
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  ...(process.env.CI ? { workers: 1 as const } : {}),
  reporter: process.env.CI ? 'github' : 'html',
  use: {
    baseURL: 'http://localhost:3000',
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
    // CI: webpack dev server so Prisma in RSC sees the same env as the parent (Turbopack workers can miss it)
    command: process.env.CI ? 'npm run dev:e2e' : 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: process.env.CI ? 120_000 : 30_000,
    env: webServerEnv(),
  },
});
