// Shared types for the naturalness detection pipeline

export type NaturalnessFlagType =
  | 'false_friend'
  | 'calqued_collocation'
  | 'calqued_syntax'
  | 'weak_collocation'
  | 'style_note';

export type NaturalnessDimension =
  | 'collocation'
  | 'discourse_marker'
  | 'hedging'
  | 'register'
  | 'rhythm'
  | 'given_new'
  | 'false_friend'
  | 'syntax';

export type NaturalnessConfidence = 'high' | 'medium' | 'low';

/** A naturalness flag before persistence — no DB fields like id or createdAt. */
export interface NaturalnessFlagInput {
  originalPhrase: string;
  suggestedPhrase: string;
  flagType: NaturalnessFlagType;
  dimension: NaturalnessDimension;
  confidence: NaturalnessConfidence;
  collocationMetric: string | null;
  metricValue: number | null;
  l1TransferSource: string | null;
  rationale: string;
  shownToUser: boolean;
}

/** A persisted naturalness flag returned to the client. */
export interface NaturalnessFlagDetail {
  id: string;
  originalPhrase: string;
  suggestedPhrase: string;
  flagType: NaturalnessFlagType;
  dimension: NaturalnessDimension;
  confidence: NaturalnessConfidence;
  collocationMetric: string | null;
  metricValue: number | null;
  l1TransferSource: string | null;
  rationale: string;
  shownToUser: boolean;
  userFeedback: 'helpful' | 'false_positive' | null;
}
