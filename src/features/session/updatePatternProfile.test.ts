// Unit tests for updatePatternProfile — pattern aggregation logic
import { describe, it, expect, vi } from 'vitest';
import { prismaMock } from '@/__mocks__/prisma';

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));

import { updatePatternProfile } from '@/features/session/updatePatternProfile';

describe('updatePatternProfile', () => {
  it('creates a new profile when none exists', async () => {
    prismaMock.patternProfile.findUnique.mockResolvedValue(null);
    prismaMock.patternProfile.upsert.mockResolvedValue({
      id: '1',
      userId: 'user-1',
      focusAreas: null,
      patterns: { 'grammar:past-tense': 2 },
      lastUpdated: new Date(),
    });

    await updatePatternProfile('user-1', [
      { category: 'grammar', pattern: 'past-tense', frequency: 2 },
    ]);

    expect(prismaMock.patternProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
        create: expect.objectContaining({
          userId: 'user-1',
          patterns: { 'grammar:past-tense': 2 },
        }),
        update: expect.objectContaining({
          patterns: { 'grammar:past-tense': 2 },
        }),
      })
    );
  });

  it('merges new patterns with existing pattern counts', async () => {
    prismaMock.patternProfile.findUnique.mockResolvedValue({
      id: '1',
      userId: 'user-1',
      focusAreas: null,
      patterns: { 'grammar:past-tense': 3, 'filler:um': 1 },
      lastUpdated: new Date(),
    });
    prismaMock.patternProfile.upsert.mockResolvedValue({
      id: '1',
      userId: 'user-1',
      focusAreas: null,
      patterns: { 'grammar:past-tense': 5, 'filler:um': 1, 'vocab:repetition': 2 },
      lastUpdated: new Date(),
    });

    await updatePatternProfile('user-1', [
      { category: 'grammar', pattern: 'past-tense', frequency: 2 },
      { category: 'vocab', pattern: 'repetition', frequency: 2 },
    ]);

    expect(prismaMock.patternProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          patterns: {
            'grammar:past-tense': 5,
            'filler:um': 1,
            'vocab:repetition': 2,
          },
        }),
      })
    );
  });

  it('still calls upsert when insights array is empty', async () => {
    prismaMock.patternProfile.findUnique.mockResolvedValue({
      id: '1',
      userId: 'user-1',
      focusAreas: null,
      patterns: { 'grammar:past-tense': 3 },
      lastUpdated: new Date(),
    });
    prismaMock.patternProfile.upsert.mockResolvedValue({
      id: '1',
      userId: 'user-1',
      focusAreas: null,
      patterns: { 'grammar:past-tense': 3 },
      lastUpdated: new Date(),
    });

    await updatePatternProfile('user-1', []);

    expect(prismaMock.patternProfile.upsert).toHaveBeenCalledTimes(1);
    expect(prismaMock.patternProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          patterns: { 'grammar:past-tense': 3 },
        }),
      })
    );
  });

  it('defaults frequency to 1 when not provided', async () => {
    prismaMock.patternProfile.findUnique.mockResolvedValue(null);
    prismaMock.patternProfile.upsert.mockResolvedValue({
      id: '1',
      userId: 'user-1',
      focusAreas: null,
      patterns: { 'connector:so': 1 },
      lastUpdated: new Date(),
    });

    await updatePatternProfile('user-1', [
      { category: 'connector', pattern: 'so' }, // no frequency field
    ]);

    expect(prismaMock.patternProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          patterns: { 'connector:so': 1 },
        }),
      })
    );
  });

  it('accumulates count when same key appears in multiple insights', async () => {
    prismaMock.patternProfile.findUnique.mockResolvedValue(null);
    prismaMock.patternProfile.upsert.mockResolvedValue({
      id: '1',
      userId: 'user-1',
      focusAreas: null,
      patterns: { 'filler:um': 3 },
      lastUpdated: new Date(),
    });

    await updatePatternProfile('user-1', [
      { category: 'filler', pattern: 'um', frequency: 2 },
      { category: 'filler', pattern: 'um', frequency: 1 },
    ]);

    expect(prismaMock.patternProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          patterns: { 'filler:um': 3 },
        }),
      })
    );
  });
});
