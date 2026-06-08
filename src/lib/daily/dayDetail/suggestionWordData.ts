// Fallback vocabulary pools and practice-item extraction helpers for suggestion words
import type { DaySuggestionWord } from './buildDayDetailData.types';
import type { DayEvidenceBundle } from './buildDayEvidenceBundle';

export const FAMILY_SIZE = 4;

// ---------------------------------------------------------------------------
// Hardcoded fallback pools (C1/C2 high-value items)
// ---------------------------------------------------------------------------

export const FALLBACK_COLLOCATIONS = [
  'draw a conclusion', 'take into account', 'raise a concern', 'address the issue',
  'provide insight', 'reach a consensus', 'pose a challenge', 'yield results',
] as const;

export const FALLBACK_CONNECTORS_BY_FUNCTION = {
  contrast: ['however', 'nevertheless', 'although', 'on the other hand'],
  cause: ['consequently', 'therefore', 'since', 'as a result'],
  addition: ['furthermore', 'moreover', 'additionally', 'in addition'],
  concession: ['admittedly', 'granted', 'to some extent', 'arguably'],
} satisfies Record<string, readonly string[]>;

export const FALLBACK_ADJECTIVES_ADVERBS = {
  adjective: ['substantial', 'pivotal', 'compelling', 'nuanced'],
  adverb: ['effectively', 'precisely', 'fundamentally', 'arguably'],
} satisfies Record<string, readonly string[]>;

export const FALLBACK_VERBS = {
  phrasal_verb: ['bring about', 'carry out', 'point out', 'break down'],
  prepositional_verb: ['depend on', 'account for', 'result in', 'contribute to'],
  verb: ['establish', 'facilitate', 'demonstrate', 'implement'],
} satisfies Record<string, readonly string[]>;

// ---------------------------------------------------------------------------
// Day rotation helpers
// ---------------------------------------------------------------------------

export function dayOfWeek(date: string): number {
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? 1 : parsed.getUTCDay();
}

export type VerbMode = 'phrasal_verb' | 'prepositional_verb' | 'verb';

export function verbMode(date: string): VerbMode {
  const modes: readonly VerbMode[] = ['phrasal_verb', 'prepositional_verb', 'verb'];
  return modes[dayOfWeek(date) % modes.length] ?? 'verb';
}

export function adjectiveAdverbMode(date: string): 'adjective' | 'adverb' {
  return dayOfWeek(date) % 2 === 0 ? 'adverb' : 'adjective';
}

// ---------------------------------------------------------------------------
// Practice item extraction
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'so', 'if', 'is', 'was', 'are',
  'be', 'do', 'has', 'had', 'at', 'to', 'in', 'of', 'on', 'by', 'for',
  'with', 'it', 'he', 'she', 'they', 'we', 'you', 'like', 'here', 'that',
  'this', 'not', 'no', 'yes', 'it says',
]);

export function isPracticeItem(text: string): boolean {
  if (text.length < 3 || text.length > 35) return false;
  if (text.split(/\s+/).length > 5) return false;
  if (STOP_WORDS.has(text.toLowerCase())) return false;
  if (/^\d/.test(text)) return false;
  return true;
}

const CURLY_QUOTES_RE = /[''""'"]+/g;

function cleanQuotedText(raw: string): string {
  return raw.replace(CURLY_QUOTES_RE, '').trim();
}

const QUOTED_RE = /['''"]([^'''"]+)['''"]/g;

function extractQuotedPhrases(text: string): string[] {
  const items: string[] = [];
  for (const m of text.matchAll(QUOTED_RE)) {
    const phrase = cleanQuotedText(m[1] ?? '');
    if (isPracticeItem(phrase)) items.push(phrase);
  }
  return items;
}

function extractParenthetical(text: string): string[] {
  const items: string[] = [];
  for (const m of text.matchAll(/\(([^)]+)\)/g)) {
    const inner = m[1] ?? '';
    for (const part of inner.split(/,\s*/)) {
      const phrase = cleanQuotedText(part.trim().replace(/^e\.g\.\s*/i, ''));
      if (isPracticeItem(phrase)) items.push(phrase.toLowerCase());
    }
  }
  return items;
}

export function extractPracticeItems(
  insights: DayEvidenceBundle['allInsights'],
  category: string,
  limit: number,
): string[] {
  const items: string[] = [];
  for (const insight of insights) {
    if (insight.category !== category) continue;
    const fromQuotes = extractQuotedPhrases(insight.suggestion);
    const fromParens = extractParenthetical(insight.suggestion);
    items.push(...fromQuotes, ...fromParens);
  }
  return [...new Set(items)].slice(0, limit);
}

// ---------------------------------------------------------------------------
// Fill helpers
// ---------------------------------------------------------------------------

interface FillOpts {
  readonly pool: readonly string[];
  readonly family: DaySuggestionWord['family'];
  readonly reason: string;
  readonly offset: number;
}

export function fillFromFallback(result: DaySuggestionWord[], opts: FillOpts): void {
  const existing = new Set(result.map((r) => r.text));
  let idx = 0;
  while (result.length < FAMILY_SIZE && idx < opts.pool.length) {
    const item = opts.pool[(opts.offset + idx) % opts.pool.length];
    if (item !== undefined && !existing.has(item)) {
      result.push({ text: item, family: opts.family, reason: opts.reason, source: 'fallback_pool' });
      existing.add(item);
    }
    idx++;
  }
}
