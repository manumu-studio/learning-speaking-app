// Zod schemas and types for Whisper verbose_json response segments
import { z } from 'zod';

export const whisperSegmentSchema = z.object({
  id: z.number(),
  start: z.number(),
  end: z.number(),
  text: z.string(),
  avg_logprob: z.number(),
  no_speech_prob: z.number(),
  compression_ratio: z.number(),
});

export const whisperVerboseResponseSchema = z.object({
  text: z.string(),
  language: z.string().optional().default('en'),
  segments: z.array(whisperSegmentSchema).default([]),
});

export type WhisperSegment = z.infer<typeof whisperSegmentSchema>;

export const whisperWordSchema = z.object({
  word: z.string(),
  start: z.number(),
  end: z.number(),
});

export type WhisperWord = z.infer<typeof whisperWordSchema>;

export const whisperVerboseWithWordsSchema = whisperVerboseResponseSchema.extend({
  words: z.array(whisperWordSchema).default([]),
});

export type WhisperVerboseResult = {
  text: string;
  segments: WhisperSegment[];
  language: string;
  words?: WhisperWord[];
};
