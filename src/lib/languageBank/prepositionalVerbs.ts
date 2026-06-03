// Curated list of high-value prepositional verbs for C1→C2 Spanish-L1 learners

export interface PrepositionalVerb {
  verb: string;
  preposition: string;
  example: string;
  spanishCalque: string; // the L1 error pattern
}

export const PREPOSITIONAL_VERBS: readonly PrepositionalVerb[] = [
  {
    verb: 'depend',
    preposition: 'on',
    example: 'The outcome depends on several factors.',
    spanishCalque: 'depend of',
  },
  {
    verb: 'rely',
    preposition: 'on',
    example: 'We rely on data to make decisions.',
    spanishCalque: 'rely in',
  },
  {
    verb: 'consist',
    preposition: 'of',
    example: 'The report consists of three sections.',
    spanishCalque: 'consist in',
  },
  {
    verb: 'result',
    preposition: 'in',
    example: 'Poor planning can result in delays.',
    spanishCalque: 'result on',
  },
  {
    verb: 'account',
    preposition: 'for',
    example: 'This factor accounts for most of the variance.',
    spanishCalque: 'account of',
  },
  {
    verb: 'insist',
    preposition: 'on',
    example: 'She insisted on reviewing the contract herself.',
    spanishCalque: 'insist in',
  },
  {
    verb: 'succeed',
    preposition: 'in',
    example: 'They succeeded in reducing costs significantly.',
    spanishCalque: 'succeed to',
  },
  {
    verb: 'apologise',
    preposition: 'for',
    example: 'He apologised for the confusion.',
    spanishCalque: 'apologise of',
  },
  {
    verb: 'comment',
    preposition: 'on',
    example: 'The analyst commented on the market trends.',
    spanishCalque: 'comment about',
  },
  {
    verb: 'approve',
    preposition: 'of',
    example: 'The board approved of the proposed changes.',
    spanishCalque: 'approve to',
  },
  {
    verb: 'comply',
    preposition: 'with',
    example: 'All parties must comply with the regulations.',
    spanishCalque: 'comply to',
  },
  {
    verb: 'refer',
    preposition: 'to',
    example: 'Please refer to the appendix for details.',
    spanishCalque: 'refer about',
  },
  {
    verb: 'deal',
    preposition: 'with',
    example: 'The team dealt with the issue promptly.',
    spanishCalque: 'deal on',
  },
  {
    verb: 'apply',
    preposition: 'for',
    example: 'She applied for a research grant.',
    spanishCalque: 'apply to',
  },
  {
    verb: 'amount',
    preposition: 'to',
    example: 'The total costs amount to over a million.',
    spanishCalque: 'amount in',
  },
  {
    verb: 'object',
    preposition: 'to',
    example: 'Several members objected to the proposal.',
    spanishCalque: 'object of',
  },
  {
    verb: 'agree',
    preposition: 'with',
    example: 'I agree with your assessment of the situation.',
    spanishCalque: 'agree in',
  },
  {
    verb: 'invest',
    preposition: 'in',
    example: 'The company invested in new infrastructure.',
    spanishCalque: 'invest on',
  },
  {
    verb: 'participate',
    preposition: 'in',
    example: 'All students are encouraged to participate in discussions.',
    spanishCalque: 'participate of',
  },
  {
    verb: 'concentrate',
    preposition: 'on',
    example: 'We need to concentrate on the core problem.',
    spanishCalque: 'concentrate in',
  },
] as const;
