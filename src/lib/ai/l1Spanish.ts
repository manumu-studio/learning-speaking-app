// L1 Spanish interference tagger — deterministic phoneme-level rules for Spanish speakers
import type { WordResult } from './azurePronunciation.types';
import type { L1Tag } from './l1Spanish.types';

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

    // Rule: /æ/ or /ʌ/ expected, /a/ realized
    if ((expected === 'æ' || expected === 'ʌ') && topActual === 'a') {
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
  }

  // Rule: syllable-timed rhythm -- prosody pitch delta confidence below threshold
  const pitchDelta =
    word.prosodyFeedback?.monotoneSyllablePitchDeltaConfidence;
  if (pitchDelta !== undefined && pitchDelta < 0.3) {
    pushUnique(tags, 'syllable_timed');
  }

  return tags;
}

function pushUnique(arr: L1Tag[], tag: L1Tag): void {
  if (!arr.includes(tag)) arr.push(tag);
}
