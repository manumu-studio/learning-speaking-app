// Type definitions for L1 Spanish interference detection

/**
 * Tags identifying specific phoneme substitution patterns common
 * in Spanish-speaking learners of English.
 *
 * Each tag maps to a specific contrastive analysis rule applied
 * deterministically from Azure NBest phoneme data.
 */
export type L1Tag =
  // Consonant substitutions
  | 'b_for_v'                    // /v/ realized as /b/ (no /v/ in Spanish inventory)
  | 'th_substitution'            // /θ/ realized as /t/ or /s/
  | 'voiced_th_d'                // /ð/ realized as /d/
  | 'z_devoicing'                // /z/ realized as /s/ (Spanish has no /z/)
  | 'sh_as_ch'                   // /ʃ/ realized as /tʃ/
  | 'h_velar'                    // English /h/ realized with velar friction (/x/)
  | 'unaspirated_ptk'            // /p/, /t/, /k/ without English-level aspiration
  | 'clear_l_coda'               // Dark /ɫ/ in coda realized as clear /l/
  | 'rhotic_trilled'             // English /ɹ/ realized as trilled Spanish /r/
  | 'cluster_simplification'     // Consonant clusters simplified (e.g., "asked" → "ask")
  | 's_epenthesis'               // Vowel inserted before /s/ + consonant clusters ("eschool")
  // Vowel substitutions
  | 'no_schwa_reduction'         // /ə/ not reduced (Spanish is syllable-timed, no schwa)
  | 'vowel_collapse'             // /æ/ or /ʌ/ realized as /a/
  | 'i_vs_ee_merge'              // /ɪ/ and /iː/ not distinguished
  | 'ae_substitution'            // /æ/ (as in "cat") realized as /e/
  | 'cup_as_cap'                 // /ʌ/ realized as /a/
  | 'u_merge'                    // /ʊ/ and /uː/ not distinguished
  | 'monophthongised_diphthong'  // English diphthongs realized as monophthongs
  // Prosody
  | 'syllable_timed'             // Flat pitch delta across utterance (syllable-timing)
  | 'wrong_stress'               // Lexical stress pattern transferred from Spanish
  | 'question_intonation';       // Rising intonation on statements / falling on questions
