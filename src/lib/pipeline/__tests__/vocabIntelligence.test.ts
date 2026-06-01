// Tests for vocabulary intelligence: persistence + usage detection + word forms

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockCreateMany, mockFindMany, mockUpdateMany, mockUpdate, mockSessionCount, mockTransaction } = vi.hoisted(() => ({
  mockCreateMany: vi.fn(),
  mockFindMany: vi.fn(),
  mockUpdateMany: vi.fn(),
  mockUpdate: vi.fn(),
  mockSessionCount: vi.fn(),
  mockTransaction: vi.fn(),
}));

vi.mock('@/lib/env', () => ({
  env: { NODE_ENV: 'test' },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    vocabSuggestion: {
      createMany: mockCreateMany,
      findMany: mockFindMany,
      updateMany: mockUpdateMany,
      update: mockUpdate,
    },
    speakingSession: {
      count: mockSessionCount,
    },
    $transaction: mockTransaction,
  },
}));

import { persistVocabSuggestions } from '../persistVocabSuggestions';
import { detectVocabUsage, wordForms } from '../detectVocabUsage';

// ─── wordForms ──────────────────────────────────────────────────────────────

describe('wordForms', () => {
  it('generates base + standard variants', () => {
    const forms = wordForms('walk');
    expect(forms).toContain('walk');
    expect(forms).toContain('walks');
    expect(forms).toContain('walked');
    expect(forms).toContain('walking');
  });

  it('handles words ending in e', () => {
    const forms = wordForms('achieve');
    expect(forms).toContain('achieve');
    expect(forms).toContain('achieves');
    expect(forms).toContain('achieved');
    expect(forms).toContain('achieving');
  });

  it('handles words ending in y', () => {
    const forms = wordForms('carry');
    expect(forms).toContain('carry');
    expect(forms).toContain('carries');
    expect(forms).toContain('carried');
  });

  it('handles words ending in s/sh/ch', () => {
    const forms = wordForms('push');
    expect(forms).toContain('push');
    expect(forms).toContain('pushes');
  });

  it('normalizes to lowercase', () => {
    const forms = wordForms('HELLO');
    expect(forms[0]).toBe('hello');
  });

  it('trims whitespace', () => {
    const forms = wordForms('  test  ');
    expect(forms[0]).toBe('test');
  });
});

// ─── persistVocabSuggestions ────────────────────────────────────────────────

describe('persistVocabSuggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 0 for empty suggestions', async () => {
    const result = await persistVocabSuggestions('user1', 'session1', []);
    expect(result).toBe(0);
    expect(mockCreateMany).not.toHaveBeenCalled();
  });

  it('normalizes words to lowercase and trims', async () => {
    mockCreateMany.mockResolvedValue({ count: 2 });

    await persistVocabSuggestions('user1', 'session1', [
      { word: 'HELLO', meaning: 'greeting', exampleSentence: 'Hello world' },
      { word: '  World  ', meaning: 'earth', exampleSentence: 'Hello world' },
    ]);

    const call = mockCreateMany.mock.calls[0]?.[0];
    expect(call?.data?.[0]?.word).toBe('hello');
    expect(call?.data?.[1]?.word).toBe('world');
    expect(call?.skipDuplicates).toBe(true);
  });

  it('returns the count of inserted rows', async () => {
    mockCreateMany.mockResolvedValue({ count: 3 });

    const result = await persistVocabSuggestions('user1', 'session1', [
      { word: 'a', meaning: 'm', exampleSentence: 'e' },
      { word: 'b', meaning: 'm', exampleSentence: 'e' },
      { word: 'c', meaning: 'm', exampleSentence: 'e' },
    ]);

    expect(result).toBe(3);
  });
});

// ─── detectVocabUsage ───────────────────────────────────────────────────────

describe('detectVocabUsage', () => {
  const baseSuggestion = { firstUsedInSessionId: null, reviewCount: 0, interval: 1, easeFactor: 2.5, createdAt: new Date() };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionCount.mockResolvedValue(5);
    mockUpdate.mockResolvedValue({});
  });

  it('returns 0 when no suggestions exist', async () => {
    mockFindMany.mockResolvedValue([]);
    const result = await detectVocabUsage('user1', 'session2', 'I walked to the store');
    expect(result).toBe(0);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('detects exact word match in transcript', async () => {
    mockFindMany.mockResolvedValue([
      { id: 'vs1', word: 'eloquent', ...baseSuggestion },
    ]);

    const result = await detectVocabUsage('user1', 'session2', 'She gave an eloquent speech');
    expect(result).toBe(1);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'vs1' },
      }),
    );
  });

  it('detects morphological variants', async () => {
    mockFindMany.mockResolvedValue([
      { id: 'vs1', word: 'walk', ...baseSuggestion },
    ]);

    const result = await detectVocabUsage('user1', 'session2', 'I was walking down the street');
    expect(result).toBe(1);
  });

  it('is case-insensitive', async () => {
    mockFindMany.mockResolvedValue([
      { id: 'vs1', word: 'elaborate', ...baseSuggestion },
    ]);

    const result = await detectVocabUsage('user1', 'session2', 'She ELABORATED on the topic');
    expect(result).toBe(1);
  });

  it('returns 0 when no words match', async () => {
    mockFindMany.mockResolvedValue([
      { id: 'vs1', word: 'eloquent', ...baseSuggestion },
      { id: 'vs2', word: 'verbose', ...baseSuggestion },
    ]);

    const result = await detectVocabUsage('user1', 'session2', 'The weather was nice today');
    expect(result).toBe(0);
  });

  it('matches multiple suggestions in one transcript', async () => {
    mockFindMany.mockResolvedValue([
      { id: 'vs1', word: 'elaborate', ...baseSuggestion },
      { id: 'vs2', word: 'concise', ...baseSuggestion },
      { id: 'vs3', word: 'verbose', ...baseSuggestion },
    ]);

    const result = await detectVocabUsage(
      'user1',
      'session2',
      'I tried to be concise but ended up being too elaborate',
    );
    expect(result).toBe(2);
  });
});
