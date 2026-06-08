// Picks 16 suggestion words (4 per family) from session evidence + fallback pools
import type { DaySuggestionWord } from './buildDayDetailData.types';
import type { DayEvidenceBundle } from './buildDayEvidenceBundle';
import {
  FAMILY_SIZE, FALLBACK_COLLOCATIONS, FALLBACK_CONNECTORS_BY_FUNCTION,
  FALLBACK_ADJECTIVES_ADVERBS, FALLBACK_VERBS,
  dayOfWeek, verbMode, adjectiveAdverbMode,
  isPracticeItem, extractPracticeItems, fillFromFallback,
} from './suggestionWordData';

type SuggestionSource = DaySuggestionWord['source'];

// ---------------------------------------------------------------------------
// Per-family pickers
// ---------------------------------------------------------------------------

function pickCollocations(bundle: DayEvidenceBundle): DaySuggestionWord[] {
  const fromNaturalness = bundle.naturalnessFlags
    .filter((f) => f.suggestedPhrase.length > 0 && isPracticeItem(f.suggestedPhrase))
    .map((f) => f.suggestedPhrase);
  const fromVocab = extractPracticeItems(bundle.allInsights, 'vocabulary', FAMILY_SIZE);
  const unique = [...new Set([...fromNaturalness, ...fromVocab])];
  const result: DaySuggestionWord[] = unique.slice(0, FAMILY_SIZE).map((text, idx) => ({
    text,
    family: 'collocation' as const,
    reason: 'Addresses a naturalness pattern from today.',
    source: (idx < fromNaturalness.length ? 'naturalness_flag' : 'vocabulary_insight') satisfies SuggestionSource,
  }));
  fillFromFallback(result, { pool: [...FALLBACK_COLLOCATIONS], family: 'collocation', reason: 'High-value collocation for advanced fluency.', offset: dayOfWeek(bundle.date) * FAMILY_SIZE });
  return result.slice(0, FAMILY_SIZE);
}

function pickConnectors(bundle: DayEvidenceBundle): DaySuggestionWord[] {
  const fromStructure = extractPracticeItems(bundle.allInsights, 'structure', FAMILY_SIZE);
  const groups = Object.values(FALLBACK_CONNECTORS_BY_FUNCTION);
  const pool = groups[dayOfWeek(bundle.date) % groups.length] ?? groups[0] ?? [];
  const result: DaySuggestionWord[] = [...new Set(fromStructure)].slice(0, FAMILY_SIZE).map((text) => ({
    text,
    family: 'connector' as const,
    reason: 'Expands connector range for structural variety.',
    source: 'structure_insight' as const,
  }));
  fillFromFallback(result, { pool, family: 'connector', reason: 'Expands connector range for structural variety.', offset: 0 });
  return result.slice(0, FAMILY_SIZE);
}

function pickAdjectivesAdverbs(bundle: DayEvidenceBundle): DaySuggestionWord[] {
  const mode = adjectiveAdverbMode(bundle.date);
  const fromVocab = extractPracticeItems(bundle.allInsights, 'vocabulary', FAMILY_SIZE);
  const pool = FALLBACK_ADJECTIVES_ADVERBS[mode];
  const result: DaySuggestionWord[] = [...new Set(fromVocab)].slice(0, FAMILY_SIZE).map((text) => ({
    text,
    family: 'adjectiveAdverb' as const,
    reason: `Builds ${mode} precision in professional contexts.`,
    source: 'vocabulary_insight' as const,
  }));
  fillFromFallback(result, { pool: [...pool], family: 'adjectiveAdverb', reason: `Builds ${mode} precision in professional contexts.`, offset: 0 });
  return result.slice(0, FAMILY_SIZE);
}

function pickVerbs(bundle: DayEvidenceBundle): DaySuggestionWord[] {
  const mode = verbMode(bundle.date);
  const fromGrammar = extractPracticeItems(bundle.allInsights, 'grammar', 2);
  const fromVocab = extractPracticeItems(bundle.allInsights, 'vocabulary', 2);
  const pool = FALLBACK_VERBS[mode];
  const unique = [...new Set([...fromGrammar, ...fromVocab])];
  const result: DaySuggestionWord[] = unique.slice(0, FAMILY_SIZE).map((text, idx) => ({
    text,
    family: 'verb' as const,
    reason: `Strengthens ${mode.replace('_', ' ')} command.`,
    source: (idx < fromGrammar.length ? 'grammar_insight' : 'vocabulary_insight') satisfies SuggestionSource,
  }));
  fillFromFallback(result, { pool: [...pool], family: 'verb', reason: `Strengthens ${mode.replace('_', ' ')} command.`, offset: 0 });
  return result.slice(0, FAMILY_SIZE);
}

// ---------------------------------------------------------------------------
// Fallback pool lookup by family + date rotation
// ---------------------------------------------------------------------------

function fallbackPoolForFamily(family: string, date: string): readonly string[] {
  if (family === 'collocation') return FALLBACK_COLLOCATIONS;
  if (family === 'connector') {
    const groups = Object.values(FALLBACK_CONNECTORS_BY_FUNCTION);
    return groups[dayOfWeek(date) % groups.length] ?? groups[0] ?? [];
  }
  if (family === 'adjectiveAdverb') return FALLBACK_ADJECTIVES_ADVERBS[adjectiveAdverbMode(date)];
  return FALLBACK_VERBS[verbMode(date)];
}

// ---------------------------------------------------------------------------
// Dedup + backfill so every family reaches 4 items
// ---------------------------------------------------------------------------

function deduplicateAndBackfill(words: DaySuggestionWord[], date: string): DaySuggestionWord[] {
  const seen = new Set<string>();
  const deduped = words.filter((w) => {
    const key = w.text.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const byFamily = new Map<string, DaySuggestionWord[]>();
  for (const w of deduped) {
    const bucket = byFamily.get(w.family) ?? [];
    bucket.push(w);
    byFamily.set(w.family, bucket);
  }

  const families = ['collocation', 'connector', 'adjectiveAdverb', 'verb'] as const;
  for (const family of families) {
    const bucket = byFamily.get(family) ?? [];
    if (bucket.length >= FAMILY_SIZE) continue;
    const pool = fallbackPoolForFamily(family, date);
    for (const item of pool) {
      if (bucket.length >= FAMILY_SIZE) break;
      if (seen.has(item.toLowerCase())) continue;
      seen.add(item.toLowerCase());
      bucket.push({ text: item, family, reason: 'High-value practice item for advanced fluency.', source: 'fallback_pool' });
    }
    byFamily.set(family, bucket);
  }

  return families.flatMap((f) => byFamily.get(f) ?? []);
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/** Picks 16 suggestion words (4 per family) from evidence + fallback rotation pools. */
export function buildSuggestionWords(bundle: DayEvidenceBundle): DaySuggestionWord[] {
  const raw = [
    ...pickCollocations(bundle),
    ...pickConnectors(bundle),
    ...pickAdjectivesAdverbs(bundle),
    ...pickVerbs(bundle),
  ];
  return deduplicateAndBackfill(raw, bundle.date);
}
