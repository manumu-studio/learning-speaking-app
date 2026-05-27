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

function detectTags(word: WordResult): L1Tag[] {
  const tags: L1Tag[] = [];

  for (const phoneme of word.phonemes) {
    const expected = phoneme.phoneme;
    const topActual = phoneme.nBest?.[0]?.phoneme ?? null;
    const accuracy = phoneme.accuracyScore;

    if (topActual === null) continue;

    // Rule: /v/ expected, /b/ realized, accuracy < 60
    if (expected === 'v' && topActual === 'b' && accuracy < 60) {
      pushUnique(tags, 'b_for_v');
    }

    // Rule: /θ/ expected, /t/ or /s/ realized
    if (expected === 'θ' && (topActual === 't' || topActual === 's')) {
      pushUnique(tags, 'th_substitution');
    }

    // Rule: /ð/ expected, /d/ realized, accuracy < 60
    if (expected === 'ð' && topActual === 'd' && accuracy < 60) {
      pushUnique(tags, 'voiced_th_d');
    }

    // Rule: /z/ expected, /s/ realized, accuracy < 60
    if (expected === 'z' && topActual === 's' && accuracy < 60) {
      pushUnique(tags, 'z_devoicing');
    }

    // Rule: /ə/ expected, different phoneme realized, accuracy < 70
    if (expected === 'ə' && topActual !== 'ə' && accuracy < 70) {
      pushUnique(tags, 'no_schwa_reduction');
    }

    // Rule: /æ/ expected, /a/ realized (general vowel collapse — /ʌ/ handled by cup_as_cap)
    if (expected === 'æ' && topActual === 'a') {
      pushUnique(tags, 'vowel_collapse');
    }

    // Rule: /ʃ/ expected, /tʃ/ realized
    if (expected === 'ʃ' && topActual === 'tʃ') {
      pushUnique(tags, 'sh_as_ch');
    }

    // Rule: /ɪ/ or /iː/ -- check for merge (both map to /i/ in nBest)
    if ((expected === 'ɪ' || expected === 'iː') && topActual === 'i' && accuracy < 70) {
      pushUnique(tags, 'i_vs_ee_merge');
    }

    // Rule: /æ/ expected, /e/ realized
    if (expected === 'æ' && topActual === 'e') {
      pushUnique(tags, 'ae_substitution');
    }

    // Rule: /ʌ/ expected, /a/ realized (cup/cap confusion)
    if (expected === 'ʌ' && topActual === 'a') {
      pushUnique(tags, 'cup_as_cap');
    }

    // Rule: /ʊ/ or /uː/ -- check for merge
    if ((expected === 'ʊ' || expected === 'uː') && topActual === 'u' && accuracy < 70) {
      pushUnique(tags, 'u_merge');
    }

    // Rule: /h/ expected, accuracy < 50 — Spanish speakers produce velar /x/ friction
    if (expected === 'h' && accuracy < 50) {
      pushUnique(tags, 'h_velar');
    }

    // Rule: word-initial /p/, /t/, /k/ with accuracy 40-65 — likely unaspirated
    if (
      (expected === 'p' || expected === 't' || expected === 'k') &&
      accuracy >= 40 &&
      accuracy < 65 &&
      phoneme === word.phonemes[0]
    ) {
      pushUnique(tags, 'unaspirated_ptk');
    }

    // Rule: /l/ in word-final position with accuracy < 60 — clear /l/ instead of dark /ɫ/
    const isLastPhoneme = word.phonemes.indexOf(phoneme) === word.phonemes.length - 1;
    if (expected === 'l' && accuracy < 60 && isLastPhoneme) {
      pushUnique(tags, 'clear_l_coda');
    }

    // Rule: English /ɹ/ expected, /r/ in nBest — trilled or tapped Spanish /r/
    if (expected === 'ɹ' && topActual === 'r') {
      pushUnique(tags, 'rhotic_trilled');
    }

    // Rule: phoneme in a cluster position with accuracy < 40 and nBest shows deletion
    if (accuracy < 40 && topActual === '' && expected !== '') {
      pushUnique(tags, 'cluster_simplification');
    }

    // Rule: word starts with /s/ + consonant, extra phoneme detected before /s/
    if (
      expected === 's' &&
      phoneme === word.phonemes[0] &&
      (topActual === 'e' || topActual === 'ɛ') &&
      accuracy < 70
    ) {
      pushUnique(tags, 's_epenthesis');
    }

    // Rule: diphthong expected, monophthong in nBest
    if ((DIPHTHONGS as readonly string[]).includes(expected)) {
      const flattenedTo = MONOPHTHONG_MAP[expected];
      if (flattenedTo !== undefined && flattenedTo.includes(topActual)) {
        pushUnique(tags, 'monophthongised_diphthong');
      }
    }
  }

  // Rule: syllable-timed rhythm -- prosody pitch delta confidence below threshold
  const pitchDelta =
    word.prosodyFeedback?.monotoneSyllablePitchDeltaConfidence;
  if (pitchDelta !== undefined && pitchDelta < 0.3) {
    pushUnique(tags, 'syllable_timed');
  }

  // Rule: unexpected break pattern suggests stress on wrong syllable
  const hasUnexpectedBreak = word.prosodyFeedback?.breakErrorTypes?.includes('UnexpectedBreak');
  if (hasUnexpectedBreak) {
    pushUnique(tags, 'wrong_stress');
  }

  // Rule: question_intonation — requires sentence-level data not available per-word
  // Detection deferred — tag exists in type system but no rule fires yet.
  // Will be implemented when sentence-level prosody analysis is available.

  return tags;
}

function pushUnique(arr: L1Tag[], tag: L1Tag): void {
  if (!arr.includes(tag)) arr.push(tag);
}
