// Training system type definitions — drill types, prompts, feedback, and recommendations

export type DrillType = 'rephrase' | 'constraint' | 'vocabUpgrade' | 'precision' | 'conclusion';

export type DrillPrompt = {
  drillType: DrillType;
  metricKey: string;
  prompt: string;
  sourceExample: string | null;
  timeLimit: number;
};

export type DrillFeedbackResult = {
  feedback: string;
  improved: boolean;
};

export type DrillRecommendation = {
  drillType: DrillType;
  metricKey: string;
  metricLabel: string;
  prompt: string;
  sourceExample: string | null;
  timeLimit: number;
};
