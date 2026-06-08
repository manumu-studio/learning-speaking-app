// Types and schemas for the day-detail meta-session read model
import { z } from 'zod';

export const SourceAvailabilitySchema = z.object({
  pronunciation: z.boolean(),
  naturalness: z.boolean(),
  corpus: z.boolean(),
  verbatim: z.boolean(),
  grammar: z.boolean(),
  languageBank: z.boolean(),
});

export const DayMetricSummarySchema = z.object({
  key: z.string(),
  label: z.string(),
  score: z.number().nullable(),
  note: z.string().nullable(),
});

export const DayHeroDataSchema = z.object({
  date: z.string(),
  overallScore: z.number().nullable(),
  sessionCount: z.number().int().nonnegative(),
  totalDurationSecs: z.number().int().nonnegative(),
  totalWords: z.number().int().nonnegative(),
  focusAreas: z.array(z.string()),
  topicSentence: z.string(),
  pillarScores: z.object({
    delivery: z.number().nullable(),
    language: z.number().nullable(),
    pronunciation: z.number().nullable(),
  }),
});

export const DaySessionMetricSchema = z.object({
  label: z.string(),
  value: z.string(),
  tone: z.enum(['good', 'watch', 'neutral']),
});

export const DaySessionSummarySchema = z.object({
  id: z.string(),
  href: z.string(),
  sessionNumber: z.number().int().positive(),
  timeLabel: z.string(),
  topic: z.string(),
  durationSecs: z.number().int().nonnegative(),
  wordCount: z.number().int().nonnegative(),
  pronunciationMetric: DaySessionMetricSchema.nullable(),
  speechMetric: DaySessionMetricSchema.nullable(),
});

export const DayFeedbackItemSchema = z.object({
  title: z.string(),
  detail: z.string(),
  tone: z.enum(['good', 'watch', 'neutral']),
  evidence: z.string().nullable(),
});

export const DaySpeechQualityCategorySchema = z.object({
  key: z.enum(['grammar', 'vocabulary', 'structure', 'register', 'naturalness', 'wordBank']),
  label: z.string(),
  score: z.number().nullable(),
  summary: z.string(),
  metrics: z.array(DayMetricSummarySchema),
  items: z.array(DayFeedbackItemSchema),
  emptyState: z.string().nullable(),
});

export const DaySpeechQualityDataSchema = z.object({
  categories: z.array(DaySpeechQualityCategorySchema),
  sourceAvailability: SourceAvailabilitySchema,
});

export const DayPronunciationCategorySchema = z.object({
  key: z.enum([
    'scoreSummary',
    'phonemePatterns',
    'prioritySounds',
    'rhythmIntonation',
    'prosodyDetails',
    'pitchContour',
    'practiceSuggestion',
    'accentPolish',
    'pronunciationProgress',
  ]),
  label: z.string(),
  score: z.number().nullable(),
  summary: z.string(),
  items: z.array(DayFeedbackItemSchema),
  emptyState: z.string().nullable(),
});

export const DayPronunciationDataSchema = z.object({
  categories: z.array(DayPronunciationCategorySchema),
  sourceAvailability: SourceAvailabilitySchema,
});

export const DaySuggestionWordSchema = z.object({
  text: z.string(),
  family: z.enum(['collocation', 'connector', 'adjectiveAdverb', 'verb']),
  reason: z.string(),
  source: z.enum([
    'naturalness_flag', 'vocabulary_insight', 'structure_insight',
    'grammar_insight', 'fallback_pool',
  ]),
});

export const DayWordBankGroupSchema = z.object({
  label: z.string(),
  items: z.array(z.object({
    text: z.string(),
    masteryState: z.string(),
    usageCount: z.number().int().nonnegative(),
    isActiveTarget: z.boolean(),
  })),
});

export const DayActiveTargetSchema = z.object({
  text: z.string(),
  reason: z.string(),
});

export const DayGeneralFeedbackDataSchema = z.object({
  summary: z.string(),
  suggestionWords: z.array(DaySuggestionWordSchema),
  wordBank: z.array(DayWordBankGroupSchema),
  activeTargets: z.array(DayActiveTargetSchema),
  emptyState: z.string().nullable(),
});

export const DayTranscriptTokenSchema = z.object({
  text: z.string(),
  kind: z.enum(['word', 'punctuation', 'space', 'lineBreak']),
  pronunciation: z.object({
    display: z.string().nullable(),
    accuracyScore: z.number(),
    errorType: z.string(),
    wordIndex: z.number().int().nonnegative(),
    offsetMs: z.number().int().nonnegative(),
    durationMs: z.number().int().nonnegative(),
    scoreBand: z.enum(['green', 'amber', 'red', 'grayItalic']),
    phonemes: z.unknown(),
    l1Tags: z.array(z.string()),
    breakErrorTypes: z.array(z.string()),
    intonationErrorTypes: z.array(z.string()),
    monotonePitchDelta: z.number().nullable(),
  }).nullable(),
});

export const DayTranscriptModeSchema = z.object({
  kind: z.enum(['pronunciationMap', 'yourWords', 'improved']),
  label: z.string(),
  text: z.string(),
  tokens: z.array(DayTranscriptTokenSchema),
  wordCount: z.number().int().nonnegative().nullable(),
});

export const DayTranscriptSessionSchema = z.object({
  sessionId: z.string(),
  title: z.string(),
  topic: z.string(),
  modes: z.array(DayTranscriptModeSchema),
});

export const DayTranscriptDataSchema = z.object({
  sessions: z.array(DayTranscriptSessionSchema),
  emptyState: z.string().nullable(),
});

export const DayDetailDataSchema = z.object({
  hero: DayHeroDataSchema,
  sessions: z.array(DaySessionSummarySchema),
  speechQuality: DaySpeechQualityDataSchema,
  pronunciation: DayPronunciationDataSchema,
  generalFeedback: DayGeneralFeedbackDataSchema,
  transcript: DayTranscriptDataSchema,
});

export type SourceAvailability = z.infer<typeof SourceAvailabilitySchema>;
export type DayMetricSummary = z.infer<typeof DayMetricSummarySchema>;
export type DayHeroData = z.infer<typeof DayHeroDataSchema>;
export type DaySessionMetric = z.infer<typeof DaySessionMetricSchema>;
export type DaySessionSummary = z.infer<typeof DaySessionSummarySchema>;
export type DayFeedbackItem = z.infer<typeof DayFeedbackItemSchema>;
export type DaySpeechQualityCategory = z.infer<typeof DaySpeechQualityCategorySchema>;
export type DaySpeechQualityData = z.infer<typeof DaySpeechQualityDataSchema>;
export type DayPronunciationCategory = z.infer<typeof DayPronunciationCategorySchema>;
export type DayPronunciationData = z.infer<typeof DayPronunciationDataSchema>;
export type DaySuggestionWord = z.infer<typeof DaySuggestionWordSchema>;
export type DayWordBankGroup = z.infer<typeof DayWordBankGroupSchema>;
export type DayActiveTarget = z.infer<typeof DayActiveTargetSchema>;
export type DayGeneralFeedbackData = z.infer<typeof DayGeneralFeedbackDataSchema>;
export type DayTranscriptToken = z.infer<typeof DayTranscriptTokenSchema>;
export type DayTranscriptMode = z.infer<typeof DayTranscriptModeSchema>;
export type DayTranscriptSession = z.infer<typeof DayTranscriptSessionSchema>;
export type DayTranscriptData = z.infer<typeof DayTranscriptDataSchema>;
export type DayDetailData = z.infer<typeof DayDetailDataSchema>;
