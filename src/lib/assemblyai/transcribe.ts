// Verbatim transcription via AssemblyAI Universal-3-Pro — preserves disfluencies.
import { z } from 'zod';
import { getAssemblyAIClient } from '@/lib/assemblyai/client';
import { logger } from '@/lib/logger';

// Official disfluency-preserving prompt from the Universal-3-Pro docs.
const VERBATIM_PROMPT = `Required: Preserve the original language(s) and script as spoken, including code-switching and mixed-language phrases.

Mandatory: Preserve linguistic speech patterns including disfluencies, filler words, hesitations, repetitions, stutters, false starts, and colloquialisms in the spoken language.

Always: Transcribe speech with your best guess based on context in all possible scenarios where speech is present in the audio.`;

// Ordered fallback list — U3-Pro handles English, Universal-2 covers the rest.
const SPEECH_MODELS = ['universal-3-pro', 'universal-2'];

// ---------------------------------------------------------------------------
// Response boundary schema — validate the SDK output, never trust it raw.
// ---------------------------------------------------------------------------
const verbatimWordSchema = z.object({
  text: z.string(),
  start: z.number(), // ms
  end: z.number(), // ms
  confidence: z.number(), // 0–1
});

const verbatimResponseSchema = z.object({
  text: z.string(),
  words: z.array(verbatimWordSchema).default([]),
});

export type VerbatimWord = z.infer<typeof verbatimWordSchema>;

export type VerbatimResult = {
  text: string;
  words: VerbatimWord[];
  wordCount: number;
  provider: 'assemblyai';
};

/**
 * Transcribes audio verbatim via AssemblyAI Universal-3-Pro.
 *
 * Returns `null` on any failure (missing key, API error, malformed response) so
 * the pipeline can continue with Whisper alone. Never throws.
 *
 * @param audioUrl - A short-lived, AssemblyAI-fetchable HTTPS URL (e.g. a presigned R2 GET URL).
 * @returns The validated verbatim result, or `null` if transcription failed.
 */
export async function transcribeVerbatim(audioUrl: string): Promise<VerbatimResult | null> {
  try {
    const transcript = await getAssemblyAIClient().transcripts.transcribe({
      audio: audioUrl,
      speech_models: SPEECH_MODELS,
      language_code: 'en',
      prompt: VERBATIM_PROMPT,
    });

    if (transcript.status === 'error') {
      logger.error({ err: transcript.error }, 'AssemblyAI transcription returned error status');
      return null;
    }

    const parsed = verbatimResponseSchema.parse({
      text: transcript.text ?? '',
      words: transcript.words ?? [],
    });

    return {
      text: parsed.text,
      words: parsed.words,
      wordCount: parsed.words.length,
      provider: 'assemblyai',
    };
  } catch (error) {
    logger.error({ err: error }, 'AssemblyAI verbatim transcription failed');
    return null;
  }
}
