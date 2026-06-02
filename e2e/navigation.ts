// Shared Playwright navigation helper for app routes.
import type { Page, Response } from '@playwright/test';
import { e2eTimeout } from './timeouts';

const DEFAULT_NAVIGATION_TIMEOUT_MS = e2eTimeout(30_000, 120_000);

export function gotoAppPage(
  page: Page,
  path: string,
  timeout = DEFAULT_NAVIGATION_TIMEOUT_MS,
): Promise<Response | null> {
  return page.goto(path, { waitUntil: 'domcontentloaded', timeout });
}
