// Tests for rewriteTranscript — vocabulary-enhanced transcript generation

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rewriteTranscript } from './rewriteTranscript';
import type { VocabWord } from './rewriteTranscript';

const mockCreate = vi.fn();

vi.mock('@/lib/ai/client', () => ({
  getAnthropicClient: () => ({
    messages: { create: mockCreate },
  }),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

const sampleVocab: VocabWord[] = [
  { word: 'eloquent', meaning: 'fluent and persuasive in speaking', exampleSentence: 'She gave an eloquent speech.' },
  { word: 'nuanced', meaning: 'characterized by subtle distinctions', exampleSentence: 'A nuanced argument is more convincing.' },
  { word: 'compelling', meaning: 'evoking interest or attention', exampleSentence: 'The evidence was compelling.' },
];

const longTranscript = 'I think that the way we communicate is really important because it helps us share ideas and connect with other people in meaningful ways and build relationships that last over time and create opportunities for growth and understanding in our communities.';

function mockResponse(text: string) {
  mockCreate.mockResolvedValueOnce({
    content: [{ type: 'text', text }],
  });
}

describe('rewriteTranscript', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns rewritten text with wordsUsed', async () => {
    const response = JSON.stringify({
      improvedText: 'I think that the way we communicate is eloquent because it helps us share nuanced ideas.',
      wordsUsed: ['eloquent', 'nuanced'],
    });
    mockResponse(response);

    const result = await rewriteTranscript(longTranscript, sampleVocab);

    expect(result).not.toBeNull();
    expect(result?.improvedText).toContain('eloquent');
    expect(result?.wordsUsed).toEqual(['eloquent', 'nuanced']);
    expect(mockCreate).toHaveBeenCalledOnce();
  });

  it('returns null for short transcripts (< 20 words)', async () => {
    const result = await rewriteTranscript('Hello world this is short.', sampleVocab);

    expect(result).toBeNull();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns null when no vocabulary suggestions', async () => {
    const result = await rewriteTranscript(longTranscript, []);

    expect(result).toBeNull();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('handles JSON wrapped in code fences', async () => {
    const response = '```json\n{"improvedText": "Rewritten text here.", "wordsUsed": ["eloquent"]}\n```';
    mockResponse(response);

    const result = await rewriteTranscript(longTranscript, sampleVocab);

    expect(result).not.toBeNull();
    expect(result?.improvedText).toBe('Rewritten text here.');
    expect(result?.wordsUsed).toEqual(['eloquent']);
  });

  it('returns null on invalid JSON response', async () => {
    mockResponse('This is not JSON at all');

    const result = await rewriteTranscript(longTranscript, sampleVocab);

    expect(result).toBeNull();
  });

  it('returns null when response missing required fields', async () => {
    mockResponse(JSON.stringify({ text: 'no improvedText field' }));

    const result = await rewriteTranscript(longTranscript, sampleVocab);

    expect(result).toBeNull();
  });

  it('returns null when improvedText is empty', async () => {
    mockResponse(JSON.stringify({ improvedText: '  ', wordsUsed: [] }));

    const result = await rewriteTranscript(longTranscript, sampleVocab);

    expect(result).toBeNull();
  });

  it('filters non-string values from wordsUsed', async () => {
    mockResponse(JSON.stringify({
      improvedText: 'Some rewritten text with eloquent phrasing.',
      wordsUsed: ['eloquent', 42, null, 'nuanced'],
    }));

    const result = await rewriteTranscript(longTranscript, sampleVocab);

    expect(result).not.toBeNull();
    expect(result?.wordsUsed).toEqual(['eloquent', 'nuanced']);
  });

  it('returns null on API error', async () => {
    mockCreate.mockRejectedValueOnce(new Error('API rate limit'));

    const result = await rewriteTranscript(longTranscript, sampleVocab);

    expect(result).toBeNull();
  });

  it('returns null when content type is not text', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'tool_use', id: 'x', name: 'y', input: {} }],
    });

    const result = await rewriteTranscript(longTranscript, sampleVocab);

    expect(result).toBeNull();
  });
});
