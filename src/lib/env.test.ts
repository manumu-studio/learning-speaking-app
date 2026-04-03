// Tests for environment variable validation schema — covers required fields, missing vars, and optional groups

import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// --- Schema (replicated for isolated testing — avoids parsing process.env at import time) ---

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),
  AUTH_CLIENT_ID: z.string().min(1),
  AUTH_CLIENT_SECRET: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  R2_ACCOUNT_ID: z.string().min(1).optional(),
  R2_ACCESS_KEY_ID: z.string().min(1).optional(),
  R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  R2_BUCKET_NAME: z.string().min(1).optional(),
  QSTASH_TOKEN: z.string().min(1).optional(),
  QSTASH_CURRENT_SIGNING_KEY: z.string().min(1).optional(),
  QSTASH_NEXT_SIGNING_KEY: z.string().min(1).optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  APP_URL: z.string().url().default('http://localhost:3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// --- Base valid env (only required fields) ---

const validBase = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/mydb',
  NEXTAUTH_SECRET: 'a-secret-that-is-at-least-32-characters-long!!',
  NEXTAUTH_URL: 'https://app.example.com',
  AUTH_CLIENT_ID: 'my-client-id',
  AUTH_CLIENT_SECRET: 'my-client-secret',
};

// --- Tests ---

describe('envSchema validation', () => {
  it('parses successfully with all required vars and correct types', () => {
    const result = envSchema.safeParse(validBase);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.DATABASE_URL).toBe(validBase.DATABASE_URL);
      expect(result.data.NEXTAUTH_SECRET).toBe(validBase.NEXTAUTH_SECRET);
      expect(result.data.APP_URL).toBe('http://localhost:3000'); // default applied
      expect(result.data.NODE_ENV).toBe('development'); // default applied
    }
  });

  it('throws ZodError when DATABASE_URL is missing', () => {
    const { DATABASE_URL: _, ...withoutDb } = validBase;
    void _;

    expect(() => envSchema.parse(withoutDb)).toThrow(z.ZodError);
  });

  it('throws ZodError when DATABASE_URL is not a valid URL', () => {
    const result = envSchema.safeParse({ ...validBase, DATABASE_URL: 'not-a-url' });

    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.issues.map((i) => i.path[0]);
      expect(fields).toContain('DATABASE_URL');
    }
  });

  it('throws ZodError when NEXTAUTH_SECRET is shorter than 32 characters', () => {
    const result = envSchema.safeParse({ ...validBase, NEXTAUTH_SECRET: 'too-short' });

    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.issues.map((i) => i.path[0]);
      expect(fields).toContain('NEXTAUTH_SECRET');
    }
  });

  it('throws ZodError when NEXTAUTH_URL is missing', () => {
    const { NEXTAUTH_URL: _, ...withoutUrl } = validBase;
    void _;

    expect(() => envSchema.parse(withoutUrl)).toThrow(z.ZodError);
  });

  it('parses successfully when all optional R2 and QStash vars are absent', () => {
    const result = envSchema.safeParse(validBase);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.R2_ACCOUNT_ID).toBeUndefined();
      expect(result.data.R2_ACCESS_KEY_ID).toBeUndefined();
      expect(result.data.R2_SECRET_ACCESS_KEY).toBeUndefined();
      expect(result.data.R2_BUCKET_NAME).toBeUndefined();
      expect(result.data.QSTASH_TOKEN).toBeUndefined();
      expect(result.data.QSTASH_CURRENT_SIGNING_KEY).toBeUndefined();
      expect(result.data.QSTASH_NEXT_SIGNING_KEY).toBeUndefined();
    }
  });

  it('parses successfully when optional AI keys are provided', () => {
    const result = envSchema.safeParse({
      ...validBase,
      OPENAI_API_KEY: 'sk-openai-key',
      ANTHROPIC_API_KEY: 'sk-anthropic-key',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.OPENAI_API_KEY).toBe('sk-openai-key');
      expect(result.data.ANTHROPIC_API_KEY).toBe('sk-anthropic-key');
    }
  });

  it('applies APP_URL default when not provided', () => {
    const result = envSchema.safeParse(validBase);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.APP_URL).toBe('http://localhost:3000');
    }
  });

  it('respects APP_URL when explicitly provided', () => {
    const result = envSchema.safeParse({ ...validBase, APP_URL: 'https://lsa.manumustudio.com' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.APP_URL).toBe('https://lsa.manumustudio.com');
    }
  });

  it('rejects invalid NODE_ENV value', () => {
    const result = envSchema.safeParse({ ...validBase, NODE_ENV: 'staging' });

    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.issues.map((i) => i.path[0]);
      expect(fields).toContain('NODE_ENV');
    }
  });

  it('throws ZodError when UPSTASH_REDIS_REST_URL is present but not a valid URL', () => {
    const result = envSchema.safeParse({
      ...validBase,
      UPSTASH_REDIS_REST_URL: 'not-a-url',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.issues.map((i) => i.path[0]);
      expect(fields).toContain('UPSTASH_REDIS_REST_URL');
    }
  });
});
