// React Testing Library setup -- extends Vitest matchers with DOM assertions
import '@testing-library/jest-dom/vitest';
import 'vitest-axe/extend-expect';
import { configureAxe } from 'vitest-axe';
import * as axeMatchers from 'vitest-axe/matchers';
import { expect } from 'vitest';

expect.extend(axeMatchers);

// Export pre-configured axe helper — use in tests as: const results = await axe(container)
// color-contrast disabled: jsdom cannot compute computed CSS styles for contrast checks
export const axe = configureAxe({
  rules: {
    'color-contrast': { enabled: false },
  },
});
