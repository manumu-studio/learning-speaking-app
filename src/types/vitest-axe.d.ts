// Vitest matcher types for vitest-axe — augments expect() with toHaveNoViolations
import type { NoViolationsMatcherResult } from 'vitest-axe/matchers';

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- required for module augmentation shape
  interface Assertion<T = unknown> {
    toHaveNoViolations(): NoViolationsMatcherResult;
  }
  interface AsymmetricMatchersContaining {
    toHaveNoViolations(): NoViolationsMatcherResult;
  }
}

export {};
