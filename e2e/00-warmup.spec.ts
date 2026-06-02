// Pre-compile app routes before feature specs (dev server cold-start mitigation).
import { test } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

const WARMUP_ROUTES = [
  '/',
  '/dashboard',
  '/session/new',
  '/history',
  '/drills',
  '/launch',
  '/auth/error',
] as const;

for (const route of WARMUP_ROUTES) {
  test(`warm up ${route}`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  });
}
