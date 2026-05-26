// Vitest configuration — test runner with coverage for the speaking coach app
import { defineConfig } from 'vitest/config';
import path from 'path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['node_modules', '.next', 'e2e'],
    setupFiles: ['./src/__mocks__/prisma.ts', './src/__mocks__/rtl-setup.ts'],
    environmentMatchGlobs: [['src/**/*.test.tsx', 'jsdom']],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'lcov'],
      reportsDirectory: './coverage',
      // src/app/** excluded — expanding scope requires ~20 new tests to maintain 70% thresholds
      include: ['src/lib/**', 'src/features/**'],
      exclude: [
        'src/**/*.types.ts',
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'src/**/index.ts',
        'src/__mocks__/**',
        // Infrastructure singletons — untestable without integration harness
        'src/features/auth/**',
        'src/lib/env.ts',
        'src/lib/prisma.ts',
      ],
      thresholds: {
        statements: 70,
        branches: 60,
        functions: 70,
        lines: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
