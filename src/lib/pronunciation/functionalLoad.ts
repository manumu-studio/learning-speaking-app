// Functional-load knowledge base — Bogotá-Spanish L1 → English pronunciation priorities.
// Each entry pairs an intelligibility weight with a production rule and IPA-annotated examples.
// Research basis: Munro & Derwing (2006) functional load; Levis (2005) intelligibility principle.

import type { FunctionalLoadEntry, FLTier, FLWeight } from './functionalLoad.types';

const WEIGHT_BY_TIER: Record<FLTier, FLWeight> = { high: 3, moderate: 2, low: 1 };

/** IPA markers that signal a long vowel or diphthong (a "double vowel sound"). */
const LONG_VOWELS = ['iː', 'uː', 'ɑː', 'ɔː', 'ɜː'];
const DIPHTHONGS = ['eɪ', 'aɪ', 'ɔɪ', 'aʊ', 'oʊ'];

/**
 * Detects whether an IPA transcription contains a long vowel or diphthong worth
 * highlighting for the learner (the "double vowel sound" emphasis).
 *
 * @param ipa - IPA string, e.g. "/ʃiːp/".
 * @returns True if a long vowel (ː) or diphthong is present.
 */
export function hasDoubleVowelSound(ipa: string): boolean {
  if (ipa.includes('ː')) return true;
  return [...LONG_VOWELS, ...DIPHTHONGS].some((v) => ipa.includes(v));
}

// Helper to stamp the double-vowel flag onto an example so the table stays declarative.
function ex(word: string, ipa: string): { word: string; ipa: string; hasDoubleVowelSound: boolean } {
  return { word, ipa, hasDoubleVowelSound: hasDoubleVowelSound(ipa) };
}

// Raw entries without the derived `weight` field; weight is filled from the tier below.
const RAW_ENTRIES: ReadonlyArray<Omit<FunctionalLoadEntry, 'weight'>> = [
  // ─── HIGH functional load (prioritise always) ──────────────────────────────
  {
    id: 'ship-sheep',
    tier: 'high',
    kind: 'phoneme',
    label: 'ship / sheep',
    ipaSymbols: ['ɪ', 'iː'],
    description: 'Spanish has one /i/, so the short /ɪ/ and long /iː/ collapse into the same sound — "ship" and "sheep" become indistinguishable.',
    rule: 'For /iː/ hold the vowel long and smile-spread the lips ("sheep" = /ʃiːp/). For /ɪ/ keep it short, lax and lower ("ship" = /ʃɪp/). The difference is length + tension, not a new letter.',
    examples: [ex('sheep', '/ʃiːp/'), ex('ship', '/ʃɪp/'), ex('eat', '/iːt/'), ex('it', '/ɪt/')],
  },
  {
    id: 'cat-vowel',
    tier: 'high',
    kind: 'phoneme',
    label: '/æ/ as in "cat"',
    ipaSymbols: ['æ'],
    description: 'The open front /æ/ has no Spanish equivalent and is pulled toward /ɑ/ ("cot") or /e/ ("ket").',
    rule: 'Drop the jaw and spread the lips wide, lower than Spanish "e": "cat" = /kæt/, not /kat/ or /ket/. Exaggerate the openness at first.',
    examples: [ex('cat', '/kæt/'), ex('bad', '/bæd/'), ex('man', '/mæn/')],
  },
  {
    id: 's-cluster',
    tier: 'high',
    kind: 'structural',
    label: 's-cluster (no "e" before s-)',
    ipaSymbols: [],
    description: 'Spanish words never begin with s+consonant, so an /e/ is inserted: "school" → "eschool", "speak" → "espeak".',
    rule: 'Start the word on the /s/ itself — no vowel before it: "school" = /skuːl/, "Spain" = /speɪn/. Hiss the /s/ first, then add the rest.',
    examples: [ex('school', '/skuːl/'), ex('speak', '/spiːk/'), ex('student', '/ˈstuːdənt/'), ex('start', '/stɑːrt/')],
  },
  {
    id: 'final-consonant',
    tier: 'high',
    kind: 'structural',
    label: 'dropped final consonants',
    ipaSymbols: [],
    description: 'Spanish syllables rarely close on consonant clusters, so final consonants get weakened or dropped: "asked" → "ask", "world" → "wor".',
    rule: 'Fully release the final consonant(s) — especially clusters. "asked" = /æskt/, "helped" = /hɛlpt/. Slightly over-pronounce the ending until it feels natural.',
    examples: [ex('asked', '/æskt/'), ex('world', '/wɜːrld/'), ex('helped', '/hɛlpt/')],
  },
  {
    id: 'schwa',
    tier: 'high',
    kind: 'phoneme',
    label: 'schwa /ə/ in unstressed syllables',
    ipaSymbols: ['ə'],
    description: 'Spanish gives every vowel its full value, so unstressed syllables stay too strong: "banana" sounds like "ba-na-na" instead of "buh-NA-nuh".',
    rule: 'Reduce unstressed vowels to a relaxed, neutral /ə/ — short and weak: "banana" = /bəˈnɑːnə/, "about" = /əˈbaʊt/. Stress one syllable, mumble the rest.',
    examples: [ex('banana', '/bəˈnɑːnə/'), ex('about', '/əˈbaʊt/'), ex('support', '/səˈpɔːrt/')],
  },
  // ─── MODERATE functional load ──────────────────────────────────────────────
  {
    id: 'v-b',
    tier: 'moderate',
    kind: 'phoneme',
    label: 'vote / boat (/v/ vs /b/)',
    ipaSymbols: ['v'],
    description: 'Spanish "v" and "b" are the same sound, so English /v/ collapses into /b/ — "vote" sounds like "boat".',
    rule: 'For /v/ press the top teeth onto the lower lip and voice it — friction, not a full closure: "vote" = /voʊt/. Keep /b/ for both lips together.',
    examples: [ex('vote', '/voʊt/'), ex('very', '/ˈvɛri/'), ex('save', '/seɪv/')],
  },
  {
    id: 'z-s',
    tier: 'moderate',
    kind: 'phoneme',
    label: '/z/ (buzzing s)',
    ipaSymbols: ['z'],
    description: 'Spanish has no /z/, so "zoo" and "rose" lose the voiced buzz and become /s/.',
    rule: 'Voice the /s/ — add vocal-cord buzz while the tongue stays in the same place: "zoo" = /zuː/, "rose" = /roʊz/. Feel the throat vibrate.',
    examples: [ex('zoo', '/zuː/'), ex('rose', '/roʊz/'), ex('busy', '/ˈbɪzi/')],
  },
  {
    id: 'english-r',
    tier: 'moderate',
    kind: 'phoneme',
    label: 'English /ɹ/ (not the Spanish tap/trill)',
    ipaSymbols: ['ɹ'],
    description: 'The Spanish tapped/trilled "r" replaces the English bunched /ɹ/, marking a strong accent.',
    rule: 'Curl or bunch the tongue back without touching the roof of the mouth — no tap, no trill: "red" = /ɹɛd/, "around" = /əˈɹaʊnd/.',
    examples: [ex('red', '/ɹɛd/'), ex('around', '/əˈɹaʊnd/'), ex('right', '/ɹaɪt/')],
  },
  {
    id: 'judge-shoe',
    tier: 'moderate',
    kind: 'phoneme',
    label: 'judge / shoe (/dʒ/ vs /ʃ/)',
    ipaSymbols: ['dʒ', 'ʃ'],
    description: 'The voiced affricate /dʒ/ and voiceless /ʃ/ blur together — "judge" and "shoe" lose contrast.',
    rule: 'For /dʒ/ start with a /d/ closure then release into the buzz ("judge" = /dʒʌdʒ/). For /ʃ/ make smooth airflow with no closure ("shoe" = /ʃuː/).',
    examples: [ex('judge', '/dʒʌdʒ/'), ex('shoe', '/ʃuː/'), ex('age', '/eɪdʒ/')],
  },
  // ─── LOW functional load (accent polish — rarely affects understanding) ─────
  {
    id: 'think-this',
    tier: 'low',
    kind: 'phoneme',
    label: 'think / this (/θ/, /ð/)',
    ipaSymbols: ['θ', 'ð'],
    description: 'The dental fricatives shift to /t/, /s/ or /d/ — "think" → "tink/sink", "this" → "dis". Rarely causes confusion.',
    rule: 'Put the tongue tip lightly between the teeth and blow: voiceless "think" = /θɪŋk/, voiced "this" = /ðɪs/.',
    examples: [ex('think', '/θɪŋk/'), ex('this', '/ðɪs/'), ex('three', '/θɹiː/')],
  },
  {
    id: 'dark-l',
    tier: 'low',
    kind: 'phoneme',
    label: 'dark /l/ at word ends',
    ipaSymbols: ['l'],
    description: 'The English "dark" /l/ in "full" or "milk" is replaced by the lighter Spanish /l/. Minor accent feature.',
    rule: 'For final /l/ raise the back of the tongue toward the throat ("full" = /fʊl/ with a hollow, dark quality). Keep the light /l/ at the start of words.',
    examples: [ex('full', '/fʊl/'), ex('milk', '/mɪlk/'), ex('feel', '/fiːl/')],
  },
  {
    id: 'velar-nasal',
    tier: 'low',
    kind: 'phoneme',
    label: 'final /ŋ/ as in "sing"',
    ipaSymbols: ['ŋ'],
    description: 'The velar nasal /ŋ/ becomes /n/ — "sing" → "sin", "running" → "runnin". Low impact.',
    rule: 'Let the back of the tongue touch the soft palate and hold the nasal — no /g/ release: "sing" = /sɪŋ/, "running" = /ˈɹʌnɪŋ/.',
    examples: [ex('sing', '/sɪŋ/'), ex('running', '/ˈɹʌnɪŋ/'), ex('long', '/lɔːŋ/')],
  },
];

/** The full functional-load table, with `weight` derived from each entry's tier. */
export const FUNCTIONAL_LOAD_TABLE: ReadonlyArray<FunctionalLoadEntry> = RAW_ENTRIES.map((e) => ({
  ...e,
  weight: WEIGHT_BY_TIER[e.tier],
}));

/** Entries that map to a single Azure phoneme (joinable to `aggregatePhonemes` output). */
export const PHONEME_FL_ENTRIES = FUNCTIONAL_LOAD_TABLE.filter((e) => e.kind === 'phoneme');

/** Structural entries Azure cannot score per-phoneme (detected heuristically from word data). */
export const STRUCTURAL_FL_ENTRIES = FUNCTIONAL_LOAD_TABLE.filter((e) => e.kind === 'structural');

/**
 * Finds the functional-load entry whose IPA symbols include the given symbol.
 *
 * @param ipaSymbol - An IPA symbol as produced by `sapiToIpa`, e.g. "ɪ".
 * @returns The matching entry, or `undefined` if the symbol is not tracked.
 */
export function lookupByIpa(ipaSymbol: string): FunctionalLoadEntry | undefined {
  return PHONEME_FL_ENTRIES.find((e) => e.ipaSymbols.includes(ipaSymbol));
}
