// Vitest configuration — test runner with coverage for the speaking coach app
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['node_modules', '.next'],
    setupFiles: ['./src/__mocks__/prisma.ts'],
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
        statements: 20,
        branches: 40,
        functions: 40,
        lines: 20,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
