// Type definitions for L1 Spanish interference detection

/**
 * Tags identifying specific phoneme substitution patterns common
 * in Spanish-speaking learners of English.
 *
 * Each tag maps to a specific contrastive analysis rule applied
 * deterministically from Azure NBest phoneme data.
 */
// Implemented — rules exist in l1Spanish.ts detectTags()
export type L1Tag =
  | 'b_for_v'                    // /v/ realized as /b/ (no /v/ in Spanish inventory)
  | 'th_substitution'            // /θ/ realized as /t/ or /s/
  | 'voiced_th_d'                // /ð/ realized as /d/
  | 'z_devoicing'                // /z/ realized as /s/ (Spanish has no /z/)
  | 'no_schwa_reduction'         // /ə/ not reduced (Spanish is syllable-timed, no schwa)
  | 'vowel_collapse'             // /æ/ or /ʌ/ realized as /a/
  | 'syllable_timed'             // flat pitch delta across utterance (syllable-timing)
  | 'sh_as_ch'                   // /ʃ/ realized as /tʃ/
  | 'i_vs_ee_merge'              // /ɪ/ and /iː/ not distinguished
  | 'ae_substitution'            // /æ/ (as in "cat") realized as /e/
  | 'cup_as_cap'                 // /ʌ/ realized as /a/
  | 'u_merge';                   // /ʊ/ and /uː/ not distinguished

// Planned for future packets — rules not yet implemented:
// 'h_velar'                    — English /h/ realized with velar friction
// 'unaspirated_ptk'            — /p/, /t/, /k/ without English-level aspiration
// 'clear_l_coda'               — dark /ɫ/ in coda position realized as clear /l/
// 'rhotic_trilled'             — English /r/ realized as trilled Spanish /r/
// 'cluster_simplification'     — consonant clusters simplified
// 's_epenthesis'               — vowel inserted before /s/ + consonant clusters
// 'monophthongised_diphthong'  — English diphthongs realized as monophthongs
// 'wrong_stress'               — lexical stress pattern transferred from Spanish
// 'question_intonation'        — rising intonation on statements
