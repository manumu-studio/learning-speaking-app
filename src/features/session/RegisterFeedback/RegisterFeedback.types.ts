// Register & Pragmatics feedback component types

export type RegisterClassification = 'formal' | 'neutral' | 'informal';

export type RegisterAppropriateness = 'appropriate' | 'slightly-off' | 'mismatch';

export type HedgingLevel = 'adequate' | 'under-hedged' | 'over-hedged';

export type DirectnessLevel = 'appropriately-direct' | 'too-direct' | 'too-indirect';

export type RegisterSuggestion = {
  original: string;
  issue: string;
  alternative: string;
};

export type RegisterFeedbackProps = {
  register: RegisterClassification;
  appropriateness: RegisterAppropriateness;
  hedgingLevel: HedgingLevel;
  directnessLevel: DirectnessLevel;
  suggestions: RegisterSuggestion[];
  note: string;
};
