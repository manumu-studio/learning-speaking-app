// Vitest mock for Prisma client — import this in tests that need DB
import { beforeEach } from 'vitest';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import type { PrismaClient } from '@prisma/client';

// Polyfill Web Crypto API for Node 18+ test environments where global crypto may not be exposed
if (typeof globalThis.crypto === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeCrypto = require('crypto') as typeof import('crypto');
  (globalThis as Record<string, unknown>).crypto = nodeCrypto.webcrypto;
}

export const prismaMock = mockDeep<PrismaClient>();

beforeEach(() => {
  mockReset(prismaMock);
});
