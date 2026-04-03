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
      include: ['src/lib/**', 'src/features/**'],
      exclude: [
        'src/**/*.types.ts',
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'src/**/index.ts',
        'src/__mocks__/**',
      ],
      thresholds: {
        statements: 36,
        branches: 75,
        functions: 88,
        lines: 36,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
