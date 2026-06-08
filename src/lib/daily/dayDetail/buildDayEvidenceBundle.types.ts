// Type contracts for the day evidence bundle — consumed by all day-detail builders

export interface DayEvidenceInsight {
  readonly category: string;
  readonly pattern: string;
  readonly detail: string;
  readonly suggestion: string;
}

export interface DayEvidenceMetric {
  readonly key: string;
  readonly score: number;
}

export interface DayEvidenceGrammarIssue {
  readonly original: string;
  readonly corrected: string;
  readonly rule: string;
}

export interface DayEvidenceNaturalnessFlag {
  readonly originalPhrase: string;
  readonly suggestedPhrase: string;
  readonly flagType: string;
  readonly rationale: string;
}

export interface DayEvidencePronunciationSummary {
  readonly avgAccuracy: number | null;
  readonly avgFluency: number | null;
  readonly avgProsody: number | null;
  readonly prioritySounds: readonly string[];
  readonly repeatedSounds: readonly string[];
}

export interface DayEvidenceBankItem {
  readonly text: string;
  readonly category: string;
  readonly source: string;
  readonly usageCount: number;
  readonly masteryState: string;
  readonly isActiveTarget: boolean;
}

export interface DayEvidenceBundle {
  readonly date: string;
  readonly sessionCount: number;
  readonly totalWords: number;
  readonly pillarScores: {
    readonly delivery: number | null;
    readonly language: number | null;
    readonly pronunciation: number | null;
  };
  readonly focusAreas: readonly string[];
  readonly allInsights: readonly DayEvidenceInsight[];
  readonly allMetrics: readonly DayEvidenceMetric[];
  readonly grammarIssues: readonly DayEvidenceGrammarIssue[];
  readonly naturalnessFlags: readonly DayEvidenceNaturalnessFlag[];
  readonly pronunciationSummary: DayEvidencePronunciationSummary;
  readonly wordsUsedToday: readonly string[];
  readonly existingBankItems: readonly DayEvidenceBankItem[];
}
