// sapiToIpa: static SAPI-to-IPA phoneme mapping for Azure Pronunciation Assessment output

// ─── Mapping table ────────────────────────────────────────────────────────────

/** All 40 SAPI codes returned by Azure PA mapped to their IPA equivalents. */
export const SAPI_TO_IPA: Record<string, string> = {
  // Vowels
  aa: 'ɑː',
  ae: 'æ',
  ah: 'ʌ',
  ao: 'ɔː',
  aw: 'aʊ',
  ax: 'ə',
  ay: 'aɪ',
  eh: 'ɛ',
  er: 'ɜːr',
  ey: 'eɪ',
  ih: 'ɪ',
  iy: 'iː',
  ow: 'oʊ',
  oy: 'ɔɪ',
  uh: 'ʊ',
  uw: 'uː',
  // Consonants
  b: 'b',
  ch: 'tʃ',
  d: 'd',
  dh: 'ð',
  f: 'f',
  g: 'ɡ',
  hh: 'h',
  jh: 'dʒ',
  k: 'k',
  l: 'l',
  m: 'm',
  n: 'n',
  ng: 'ŋ',
  p: 'p',
  r: 'ɹ',
  s: 's',
  sh: 'ʃ',
  t: 't',
  th: 'θ',
  v: 'v',
  w: 'w',
  y: 'j',
  z: 'z',
  zh: 'ʒ',
} as const;

// ─── Helper functions ─────────────────────────────────────────────────────────

/**
 * Maps a single SAPI phoneme code to its IPA symbol.
 *
 * Falls back to the original SAPI code when no mapping exists (fail-safe for future Azure additions).
 *
 * @param sapi - A lowercase SAPI code, e.g. `'ae'`, `'ih'`, `'sh'`.
 * @returns The corresponding IPA symbol, e.g. `'æ'`, `'ɪ'`, `'ʃ'`, or `sapi` if unmapped.
 * @example
 * sapiToIpa('ae') // => 'æ'
 * sapiToIpa('sh') // => 'ʃ'
 * sapiToIpa('xx') // => 'xx'  (unknown code — returned as-is)
 */
export function sapiToIpa(sapi: string): string {
  return SAPI_TO_IPA[sapi] ?? sapi;
}

/**
 * Concatenates the IPA symbols for an array of phonemes into a full IPA transcription string.
 *
 * @param phonemes - Ordered phoneme objects from the Azure Pronunciation Assessment result.
 * @returns A single IPA string, e.g. `'ɛniː'` for `[{phoneme:'eh'},{phoneme:'n'},{phoneme:'iy'}]`.
 * @example
 * wordToIpa([{ phoneme: 'eh' }, { phoneme: 'n' }, { phoneme: 'iy' }]) // => 'ɛniː'
 */
export function wordToIpa(phonemes: ReadonlyArray<{ readonly phoneme: string }>): string {
  return phonemes.map((p) => sapiToIpa(p.phoneme)).join('');
}
