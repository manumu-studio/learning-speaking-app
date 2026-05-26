// Types and L1 tag label map for the PhonemeDetail component

import { z } from 'zod';
import type { WordPronunciation } from '@/components/ui/PronunciationSection';

export const PhonemeResultSchema = z.object({
  phoneme: z.string(),
  accuracyScore: z.number(),
  nBest: z
    .array(
      z.object({
        phoneme: z.string(),
        score: z.number(),
      }),
    )
    .optional(),
});

export type PhonemeResult = z.infer<typeof PhonemeResultSchema>;

export const PhonemeResultArraySchema = z.array(PhonemeResultSchema);

export interface PhonemeDetailProps {
  word: WordPronunciation;
  onClose: () => void;
}

export const L1_TAG_LABELS = {
  b_for_v: 'Using /b/ instead of /v/ (common in Spanish speakers)',
  th_substitution: 'Replacing /th/ with /t/ or /s/',
  voiced_th_d: 'Using /d/ instead of /th/ as in "this"',
  z_devoicing: 'Pronouncing /z/ as /s/ (Spanish has no /z/)',
  no_schwa_reduction: 'Full vowel where English uses a reduced schwa /ə/',
  vowel_collapse: "Merging English vowels that don't exist in Spanish",
  syllable_timed: 'Syllable-timed rhythm instead of English stress-timing',
  sh_as_ch: 'Over-articulating /sh/ as /ch/',
  h_velar: 'Velar /h/ (Spanish "jota" sound)',
  unaspirated_ptk: 'Unaspirated /p/, /t/, /k/ at word start',
  clear_l_coda: 'Clear /l/ where English uses dark /l/',
  rhotic_trilled: 'Trilled or tapped /r/ instead of English approximant',
  cluster_simplification: 'Simplifying consonant clusters (e.g., "asked" -> "ask")',
  s_epenthesis: 'Adding /e/ before s-clusters (e.g., "eschool")',
  i_vs_ee_merge: 'No distinction between short /i/ and long /ee/',
  ae_substitution: 'Replacing /ae/ (cat) with /a/',
  cup_as_cap: 'Replacing /uh/ (cup) with /a/',
  u_merge: 'No distinction between /oo/ and /u/',
  monophthongised_diphthong: 'Flattening diphthongs to single vowels',
  wrong_stress: 'Stress on wrong syllable',
  question_intonation: 'Falling intonation on yes/no questions',
} as const satisfies Record<string, string>;

export type L1TagKey = keyof typeof L1_TAG_LABELS;
