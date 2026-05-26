// Training system type definitions — drill types, prompts, feedback, and recommendations

export type DrillType = 'rephrase' | 'constraint' | 'vocabUpgrade' | 'precision' | 'conclusion' | 'pronunciation';

/** LLM-generated drill shown to the learner — includes timing and optional source sentence. */
export type DrillPrompt = {
  drillType: DrillType;
  metricKey: string;
  prompt: string;
  sourceExample: string | null;
  timeLimit: number;
};

/** Outcome of `evaluateDrill` after the learner submits audio (short feedback + boolean progress flag). */
export type DrillFeedbackResult = {
  feedback: string;
  improved: boolean;
};

/** Pre-rendered suggestion used when recommending the next drill from dashboard context. */
export type DrillRecommendation = {
  drillType: DrillType;
  metricKey: string;
  metricLabel: string;
  prompt: string;
  sourceExample: string | null;
  timeLimit: number;
};
