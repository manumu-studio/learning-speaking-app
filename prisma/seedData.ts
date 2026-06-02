// Static seed data — mock content used by the dev seed script

export const DEV_USER = {
  externalId: 'dev-user-local',
  email: 'dev@localhost',
  displayName: 'Dev Tester',
} as const;

export const MOCK_TRANSCRIPT = `So, I think the main problem with, you know, learning a new language is that you need to practice every day. I went to store yesterday and I tried to speak English with the cashier. She was very nice and she understand me, but I know I made many mistakes. For example, I always forget to use the articles. Like, I say "I went to store" instead of "I went to the store." It's something I need to work on.

Also, I notice that I use "so" a lot when I start my sentences. So, I think this is because in my native language we use a similar word. So, I need to find other ways to start my sentences. Maybe I can use "however" or "in addition" or something like that.

Another thing is that I tend to use simple sentences. I say "I went there. It was good. I liked it." But I know I should try to make more complex sentences with subordinate clauses and connectors. For example, instead of saying "I went there. It was good." I could say "Although I was tired, I went there and found it to be quite enjoyable."

I think my vocabulary is okay for basic conversations, but I need to expand it for more academic or professional topics. I need to read more books and articles in English to learn new words and expressions.`;

export const MOCK_SUMMARY =
  'Solid B2-level speaker with good communicative competence. Main areas for improvement are article usage (systematic omission before nouns), connector variety (heavy reliance on "so"), and sentence complexity (tendency toward simple, short structures rather than subordinate clauses).';

export const MOCK_FOCUS_NEXT =
  'Practice using "the" and "a" before every noun in your next session. Before speaking each sentence, mentally check: does this noun need an article?';

export const MOCK_INSIGHTS = [
  {
    category: 'grammar',
    pattern: 'Missing articles before nouns',
    detail:
      'Systematically omits definite and indefinite articles before countable nouns, particularly in prepositional phrases. This is a common L1 transfer pattern.',
    frequency: 8,
    severity: 'high',
    examples: [
      'I went to store yesterday',
      'She was very nice and she understand me',
      'I need to find other ways to start my sentences',
    ],
    suggestion:
      'Before speaking each sentence, mentally identify the nouns and add "the" (specific) or "a/an" (general) before each one.',
  },
  {
    category: 'vocabulary',
    pattern: 'Overuse of "so" as sentence starter',
    detail:
      'Uses "so" as the primary discourse connector to introduce new ideas and transitions. Appears at the start of 6 out of 10 sentences, creating a monotonous rhythm.',
    frequency: 6,
    severity: 'medium',
    examples: [
      'So, I think the main problem with...',
      'So, I think this is because...',
      'So, I need to find other ways...',
    ],
    suggestion:
      'Replace "so" with varied connectors: "however," "in contrast," "that said," "from my perspective," "what I\'ve noticed is."',
  },
  {
    category: 'structure',
    pattern: 'Simple sentence chains instead of complex structures',
    detail:
      "Tends to string together short, simple sentences rather than using subordinate clauses, relative clauses, or participial phrases. The speaker is aware of this pattern but hasn't yet automatized complex structures.",
    frequency: 5,
    severity: 'medium',
    examples: [
      'I went there. It was good. I liked it.',
      'She was very nice and she understand me, but I know I made many mistakes.',
    ],
    suggestion:
      'Practice combining two simple sentences into one using "although," "despite," "which," or "having + past participle."',
  },
] as const;

// Metric seed data — realistic progressions for dashboard testing
export const METRIC_KEYS = [
  'connectorRepetition',
  'structuralVariety',
  'vocabularyPrecision',
  'verbAccuracy',
  'argumentClosure',
  'fillerUsage',
] as const;

// Base scores with slight upward trend across 7 sessions (oldest → newest)
export const BASE_SCORES: Readonly<Record<string, ReadonlyArray<number>>> = {
  connectorRepetition: [4, 4, 5, 5, 6, 6, 7],
  structuralVariety:   [5, 5, 5, 6, 6, 7, 7],
  vocabularyPrecision: [6, 6, 7, 7, 7, 8, 8],
  verbAccuracy:        [5, 6, 6, 6, 7, 7, 7],
  argumentClosure:     [3, 4, 4, 5, 5, 5, 6],
  fillerUsage:         [4, 4, 5, 5, 5, 6, 6],
};

export type SessionSeedDef = {
  readonly durationSecs: number;
  readonly topic: string;
  readonly intentLabel: string;
  readonly summary: string;
  readonly focusNext: string;
  readonly daysAgo: number;
};

export type DrillSeedDef = {
  readonly sessionRef: 'primary' | 'second' | null;
  readonly drillType: string;
  readonly metricKey: string;
  readonly prompt: string;
  readonly sourceExample: string;
  readonly transcript: string | null;
  readonly feedback: string | null;
  readonly improved: boolean | null;
  readonly createdAt: string;
  readonly completedAt: string | null;
};

// Drill seed definitions — sessionRef resolved at runtime to actual IDs
export const DRILL_SEEDS: ReadonlyArray<DrillSeedDef> = [
  {
    sessionRef: 'primary',
    drillType: 'rephrase',
    metricKey: 'connectorRepetition',
    prompt:
      'You said: "So I think that the problem is important, so we need to fix it." Try rephrasing this without using "so" — consider using "therefore", "as a result", or "consequently" instead.',
    sourceExample: 'So I think that the problem is important, so we need to fix it.',
    transcript: 'I believe the problem is significant, therefore we need to address it promptly.',
    feedback: 'Great job eliminating the repeated "so" — your use of "therefore" sounds much more polished!',
    improved: true,
    createdAt: '2026-03-28T10:00:00Z',
    completedAt: '2026-03-28T10:02:30Z',
  },
  {
    sessionRef: 'primary',
    drillType: 'vocabUpgrade',
    metricKey: 'vocabularyPrecision',
    prompt:
      'You used "good" three times in your response. Try re-explaining your point about the team using one of these alternatives: "effective", "proficient", or "collaborative".',
    sourceExample: 'The team was good and they did a good job on the good project.',
    transcript: 'The team was effective and they delivered a proficient result on the collaborative project.',
    feedback: 'Solid upgrade — you replaced all three instances with distinct, precise alternatives.',
    improved: true,
    createdAt: '2026-03-28T10:05:00Z',
    completedAt: '2026-03-28T10:06:30Z',
  },
  {
    sessionRef: 'second',
    drillType: 'constraint',
    metricKey: 'structuralVariety',
    prompt:
      'Use this structure: "Although [challenge], [positive outcome] because [reason]." Explain your recent experience with the new workflow using this exact pattern.',
    sourceExample: 'The new workflow was hard but we managed to finish it.',
    transcript: 'Although the new workflow presented some challenges, we completed it ahead of schedule because the team adapted quickly.',
    feedback: 'Perfect structure — your "although/because" framing adds real sophistication to the argument.',
    improved: true,
    createdAt: '2026-03-29T14:00:00Z',
    completedAt: '2026-03-29T14:03:00Z',
  },
  {
    sessionRef: 'second',
    drillType: 'precision',
    metricKey: 'fillerUsage',
    prompt:
      'You said: "So, like, the thing is that we basically need to, you know, improve the process." Make this specific and concrete — what exactly needs improving and how?',
    sourceExample: 'So, like, the thing is that we basically need to, you know, improve the process.',
    transcript: 'We need to reduce the onboarding time from two weeks to five days by automating the document verification step.',
    feedback: 'Excellent — you went from vague to laser-focused with a specific metric and action!',
    improved: true,
    createdAt: '2026-03-29T14:05:00Z',
    completedAt: '2026-03-29T14:07:00Z',
  },
  {
    sessionRef: 'second',
    drillType: 'conclusion',
    metricKey: 'argumentClosure',
    prompt:
      'You were discussing the benefits of remote work but trailed off. Deliver a strong 2-3 sentence conclusion that ties back to your main point about productivity.',
    sourceExample: 'So yeah, remote work is kind of... well it has its benefits and...',
    transcript: 'So in terms of remote work, there are benefits, I think people can work better sometimes.',
    feedback: 'You made a solid attempt — next time, try ending with a definitive statement that echoes your opening argument.',
    improved: false,
    createdAt: '2026-03-29T14:10:00Z',
    completedAt: '2026-03-29T14:14:00Z',
  },
  {
    sessionRef: 'second',
    drillType: 'rephrase',
    metricKey: 'connectorRepetition',
    prompt:
      'You said: "Because the deadline was tight, because we had limited resources, we struggled." Try expressing this cause-effect relationship without repeating "because".',
    sourceExample: 'Because the deadline was tight, because we had limited resources, we struggled.',
    transcript: null,
    feedback: null,
    improved: null,
    createdAt: '2026-03-30T09:00:00Z',
    completedAt: null,
  },
  {
    sessionRef: null,
    drillType: 'vocabUpgrade',
    metricKey: 'vocabularyPrecision',
    prompt:
      'You frequently use "important" — try replacing it with "critical", "essential", or "pivotal" in your next response about project priorities.',
    sourceExample: 'This is important because the important thing is to focus on important tasks.',
    transcript: null,
    feedback: null,
    improved: null,
    createdAt: '2026-03-30T09:05:00Z',
    completedAt: null,
  },
];

// Sessions in chronological order (oldest first = index 0 used for metric base)
export const SESSION_SEEDS: ReadonlyArray<SessionSeedDef> = [
  {
    durationSecs: 130,
    topic: 'Education and learning strategies',
    intentLabel: 'Learning methods sharing',
    summary: 'Baseline performance. Room for improvement in all dimensions.',
    focusNext: 'Try to use at least 3 different discourse connectors in the next session.',
    daysAgo: 6,
  },
  {
    durationSecs: 160,
    topic: 'Work and career goals',
    intentLabel: 'Career planning talk',
    summary: 'Strong argument structure emerging. Verb tense consistency still needs attention.',
    focusNext: 'Focus on consistent use of present perfect for recent events.',
    daysAgo: 5,
  },
  {
    durationSecs: 200,
    topic: 'Health and lifestyle',
    intentLabel: 'Health habits discussion',
    summary: 'Fluent delivery on familiar topics. Connector variety still limited.',
    focusNext: 'Replace "also" with "furthermore", "in addition", or "what\'s more".',
    daysAgo: 4,
  },
  {
    durationSecs: 150,
    topic: 'Technology and AI',
    intentLabel: 'Technology trends discussion',
    summary: 'Good command of technical vocabulary. Sentence structures becoming more varied.',
    focusNext: 'Practice using passive voice for formal technical explanations.',
    daysAgo: 3,
  },
  {
    durationSecs: 240,
    topic: 'Travel experiences',
    intentLabel: 'Travel stories sharing',
    summary: 'Rich vocabulary for describing places. Article usage still inconsistent.',
    focusNext: 'Practice using "the" with specific places you have already mentioned.',
    daysAgo: 2,
  },
  {
    durationSecs: 120,
    topic: 'Job interview preparation',
    intentLabel: 'Job interview practice',
    summary: 'Good fluency under pressure. Needs work on past tense consistency and formal register.',
    focusNext: 'Practice answering "Tell me about yourself" using past simple consistently.',
    daysAgo: 1,
  },
];
