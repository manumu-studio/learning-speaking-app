// Shared Playwright assertion timeouts — longer locally for dev cold-compile.
export function e2eTimeout(ciMs: number, localMs = 45_000): number {
  return process.env.CI ? ciMs : localMs;
}
