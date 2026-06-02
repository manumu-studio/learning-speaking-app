// L1 Spanish interference tagger — deterministic phoneme-level rules for Spanish speakers
import type { WordResult } from './azurePronunciation.types';
import type { L1Tag } from './l1Spanish.types';

const DIPHTHONGS = ['aɪ', 'eɪ', 'oʊ', 'aʊ', 'ɔɪ'] as const;

const MONOPHTHONG_MAP: Record<string, readonly string[]> = {
  aɪ: ['a', 'ɑ'],
  eɪ: ['e', 'ɛ'],
  oʊ: ['o', 'ɔ'],
  aʊ: ['a', 'ɑ'],
  ɔɪ: ['o', 'ɔ'],
};

/**
 * Annotates each WordResult with L1 Spanish interference tags derived from
 * NBest phoneme comparisons and prosody metadata.
 *
 * Pure function — no I/O, no async, no external state.
 */
export function tagSpanishL1(words: WordResult[]): WordResult[] {
  return words.map((word) => {
    const tags = detectTags(word);
    if (tags.length === 0) return word;
    return { ...word, l1Tags: [...(word.l1Tags ?? []), ...tags] };
  });
}

// ---------------------------------------------------------------------------
// Internal rule engine
// ---------------------------------------------------------------------------

type PhonemeContext = {
  expected: string;
  topActual: string;
  accuracy: number;
  isFirst: boolean;
  isLast: boolean;
};

const TH_REALIZATIONS = new Set(['t', 's']);
const VOICELESS_STOPS = new Set(['p', 't', 'k']);
const EPENTHESIS_VOWELS = new Set(['e', 'ɛ']);

/** Checks voice-contrast substitution rules (/v,ð,z/ devoicing / place shifts). */
function checkVoicingRules(ctx: PhonemeContext, tags: L1Tag[]): void {
  const { expected, topActual, accuracy } = ctx;
  if (expected === 'v' && topActual === 'b' && accuracy < 60) pushUnique(tags, 'b_for_v');
  if (expected === 'θ' && TH_REALIZATIONS.has(topActual)) pushUnique(tags, 'th_substitution');
  if (expected === 'ð' && topActual === 'd' && accuracy < 60) pushUnique(tags, 'voiced_th_d');
  if (expected === 'z' && topActual === 's' && accuracy < 60) pushUnique(tags, 'z_devoicing');
}

/** Checks manner-of-articulation substitution rules (fricative/affricate, glottal, rhotic). */
function checkMannerRules(ctx: PhonemeContext, tags: L1Tag[]): void {
  const { expected, topActual, accuracy } = ctx;
  if (expected === 'ʃ' && topActual === 'tʃ') pushUnique(tags, 'sh_as_ch');
  if (expected === 'h' && accuracy < 50) pushUnique(tags, 'h_velar');
  if (expected === 'ɹ' && topActual === 'r') pushUnique(tags, 'rhotic_trilled');
}

/** Checks vowel substitution rules (schwa, front/back merges). */
function checkVowelSubstitutionRules(ctx: PhonemeContext, tags: L1Tag[]): void {
  const { expected, topActual, accuracy } = ctx;
  if (expected === 'ə' && topActual !== 'ə' && accuracy < 70) pushUnique(tags, 'no_schwa_reduction');
  if (expected === 'æ' && topActual === 'a') pushUnique(tags, 'vowel_collapse');
  if (expected === 'æ' && topActual === 'e') pushUnique(tags, 'ae_substitution');
  if (expected === 'ʌ' && topActual === 'a') pushUnique(tags, 'cup_as_cap');
}

/** Checks vowel-merge and diphthong-reduction rules. */
function checkVowelMergeRules(ctx: PhonemeContext, tags: L1Tag[]): void {
  const { expected, topActual, accuracy } = ctx;
  if ((expected === 'ɪ' || expected === 'iː') && topActual === 'i' && accuracy < 70) {
    pushUnique(tags, 'i_vs_ee_merge');
  }
  if ((expected === 'ʊ' || expected === 'uː') && topActual === 'u' && accuracy < 70) {
    pushUnique(tags, 'u_merge');
  }
  if ((DIPHTHONGS as readonly string[]).includes(expected)) {
    const flattenedTo = MONOPHTHONG_MAP[expected];
    if (flattenedTo !== undefined && flattenedTo.includes(topActual)) {
      pushUnique(tags, 'monophthongised_diphthong');
    }
  }
}

/** Checks cluster and word-boundary positional rules. */
function checkPositionalRules(ctx: PhonemeContext, tags: L1Tag[]): void {
  const { expected, topActual, accuracy, isFirst, isLast } = ctx;
  if (accuracy < 40 && topActual === '' && expected !== '') {
    pushUnique(tags, 'cluster_simplification');
  }
  if (VOICELESS_STOPS.has(expected) && isFirst && accuracy >= 40 && accuracy < 65) {
    pushUnique(tags, 'unaspirated_ptk');
  }
  if (expected === 'l' && isLast && accuracy < 60) pushUnique(tags, 'clear_l_coda');
  if (expected === 's' && isFirst && EPENTHESIS_VOWELS.has(topActual) && accuracy < 70) {
    pushUnique(tags, 's_epenthesis');
  }
}

/** Applies all per-phoneme rules to a word's phoneme list. */
function detectPhonemeRuleTags(word: WordResult, tags: L1Tag[]): void {
  const lastIndex = word.phonemes.length - 1;
  for (let i = 0; i <= lastIndex; i++) {
    const phoneme = word.phonemes[i];
    if (phoneme === undefined) continue;
    const topActual = phoneme.nBest?.[0]?.phoneme ?? null;
    if (topActual === null) continue;
    const ctx: PhonemeContext = {
      expected: phoneme.phoneme,
      topActual,
      accuracy: phoneme.accuracyScore,
      isFirst: i === 0,
      isLast: i === lastIndex,
    };
    checkVoicingRules(ctx, tags);
    checkMannerRules(ctx, tags);
    checkVowelSubstitutionRules(ctx, tags);
    checkVowelMergeRules(ctx, tags);
    checkPositionalRules(ctx, tags);
  }
}

/** Applies word-level prosody rules. */
function detectProsodyTags(word: WordResult, tags: L1Tag[]): void {
  const pitchDelta = word.prosodyFeedback?.monotoneSyllablePitchDeltaConfidence;
  if (pitchDelta !== undefined && pitchDelta < 0.3) pushUnique(tags, 'syllable_timed');
  if (word.prosodyFeedback?.breakErrorTypes?.includes('UnexpectedBreak')) {
    pushUnique(tags, 'wrong_stress');
  }
  // Rule: question_intonation — requires sentence-level data not available per-word.
  // Detection deferred — tag exists in type system but no rule fires yet.
}

function detectTags(word: WordResult): L1Tag[] {
  const tags: L1Tag[] = [];
  detectPhonemeRuleTags(word, tags);
  detectProsodyTags(word, tags);
  return tags;
}

function pushUnique(arr: L1Tag[], tag: L1Tag): void {
  if (!arr.includes(tag)) arr.push(tag);
}
