// Types for corpus lookup results

export type LexemeLookup = {
  readonly lemma: string;
  readonly pos: string;
  readonly freqPerMillion: number | null;
  readonly zipf: number | null;
  readonly cefr: string | null;
  readonly rank: number | null;
  readonly source: string;
};

export type CollocationLookup = {
  readonly headLemma: string;
  readonly collocate: string;
  readonly attested: boolean;
  readonly mi: number | null;
  readonly logDice: number | null;
  readonly freq: number | null;
  readonly source: string;
};

export type MweLookup = {
  readonly canonical: string;
  readonly type: string;
  readonly freq: number | null;
  readonly cefr: string | null;
  readonly senseNote: string | null;
  readonly source: string;
  readonly matchMethod: 'exact' | 'fuzzy';
};
