// Tests for pure day-detail section builders and schema compatibility.
import { describe, expect, it } from 'vitest';
import { buildDayGeneralFeedback } from './buildDayGeneralFeedback';
import { buildDayPronunciation } from './buildDayPronunciation';
import { buildDaySessions } from './buildDaySessions';
import { buildDaySpeechQuality } from './buildDaySpeechQuality';
import { buildDayTranscript } from './buildDayTranscript';
import { DayDetailDataSchema, type SourceAvailability } from './buildDayDetailData.types';

const sourceAvailability: SourceAvailability = {
  pronunciation: true,
  naturalness: true,
  corpus: true,
  verbatim: true,
  grammar: true,
  languageBank: true,
};

function phoneme(phonemeName: string, accuracyScore: number) {
  return { phoneme: phonemeName, accuracyScore };
}

describe('day detail section builders', () => {
  it('builds sorted completed session summaries with weakest daily signals', () => {
    const summaries = buildDaySessions({
      sessions: [
        {
          id: 'draft',
          status: 'CREATED',
          createdAt: new Date('2026-06-04T11:00:00Z'),
          durationSecs: null,
          intentLabel: null,
          topic: null,
          promptUsed: null,
          transcript: null,
          metrics: [],
          pronunciationReport: null,
        },
        {
          id: 'later',
          status: 'DONE',
          createdAt: new Date('2026-06-04T12:00:00Z'),
          durationSecs: 120,
          intentLabel: null,
          topic: 'Strategy update',
          promptUsed: null,
          transcript: { wordCount: 220 },
          metrics: [{ key: 'vocabularyPrecision', score: 8.2, note: 'Precise word choice.' }],
          pronunciationReport: { pronScore: 88, fluencyScore: 92, prosodyScore: 81 },
        },
        {
          id: 'earlier',
          status: 'DONE',
          createdAt: new Date('2026-06-04T09:30:00Z'),
          durationSecs: 60,
          intentLabel: 'Morning reflection',
          topic: null,
          promptUsed: null,
          transcript: { wordCount: 90 },
          metrics: [{ key: 'verbAccuracy', score: 4.6, note: 'Article slips.' }],
          pronunciationReport: { pronScore: 74, fluencyScore: 72, prosodyScore: 86 },
        },
      ],
    });

    expect(summaries).toHaveLength(2);
    expect(summaries[0]?.id).toBe('earlier');
    expect(summaries[0]?.sessionNumber).toBe(1);
    expect(summaries[0]?.speechMetric).toMatchObject({ label: 'Grammar', tone: 'watch' });
    expect(summaries[1]?.pronunciationMetric).toMatchObject({ label: 'Prosody', value: '81% prosody' });
  });

  it('builds speech quality categories from metrics, grammar flags, naturalness, and word bank', () => {
    const speechQuality = buildDaySpeechQuality({
      sessions: [{
        metrics: [
          { key: 'verbAccuracy', score: 6, note: 'Articles need attention.' },
          { key: 'vocabularyPrecision', score: 8, note: 'Specific verbs.' },
          { key: 'lexicalSophistication', score: 7, note: null },
          { key: 'structuralVariety', score: 7.5, note: null },
          { key: 'argumentClosure', score: 8.5, note: 'Clear close.' },
          { key: 'connectorRepetition', score: 5, note: 'Repeated so.' },
          { key: 'registerPragmatics', score: 7, note: 'Good hedging.' },
        ],
        insights: [
          {
            category: 'grammar',
            pattern: 'Article usage',
            detail: 'Missing articles before singular nouns.',
            suggestion: 'Use a/an with count nouns.',
          },
          {
            category: 'vocabulary',
            pattern: 'establish',
            detail: 'A more precise formal verb.',
            suggestion: 'Try establish instead of make.',
          },
          {
            category: 'structure',
            pattern: 'closing move',
            detail: 'End with a concrete next step.',
            suggestion: 'Summarize the implication.',
          },
          {
            category: 'register',
            pattern: 'hedging',
            detail: 'Soften certainty in stakeholder updates.',
            suggestion: 'Use arguably or to some extent.',
          },
        ],
        registerFeedback: { tone: 'formal' },
        grammarFlags: [{
          spanIndex: 0,
          verbatimText: 'I have car',
          normalizedText: 'I have a car',
          classification: 'grammar_error',
          errorType: 'article',
          confidence: 0.92,
          explanation: 'Missing article.',
          suggestion: 'Add a.',
          corpusEvidence: 'Singular count noun.',
        }],
      }],
      naturalnessFlags: [{
        originalPhrase: 'make a process',
        suggestedPhrase: 'establish a process',
        flagType: 'weak_collocation',
        confidence: 'high',
        collocationMetric: 'logDice',
        metricValue: 7.2,
        rationale: 'Corpus-backed collocation.',
      }],
      wordBankItems: [{
        text: 'establish',
        category: 'verb',
        masteryState: 'emerging',
        usageCount: 1,
        isActiveTarget: true,
      }],
      sourceAvailability,
    });

    expect(speechQuality.categories.map((category) => category.key)).toEqual([
      'grammar',
      'vocabulary',
      'structure',
      'register',
      'naturalness',
      'wordBank',
    ]);
    expect(speechQuality.categories[0]?.items[0]).toMatchObject({
      title: 'article',
      tone: 'watch',
    });
    expect(speechQuality.categories.find((category) => category.key === 'naturalness')?.items[0]?.evidence).toBe('logDice: 7.2');
  });

  it('builds pronunciation categories from scores, phonemes, rhythm, and functional load', () => {
    const pronunciation = buildDayPronunciation({
      sourceAvailability,
      reports: [{
        pronScore: 82,
        accuracyScore: 78,
        fluencyScore: 88,
        completenessScore: 91,
        prosodyScore: 7.8,
        speakingRateWpm: 148,
        words: [
          {
            word: 'sheep',
            accuracyScore: 62,
            errorType: 'Mispronunciation',
            phonemes: [phoneme('iy', 60)],
            breakErrorTypes: [],
            intonationErrorTypes: ['Monotone'],
            monotonePitchDelta: 0.8,
            l1Tags: ['ship_sheep'],
          },
          {
            word: 'school',
            accuracyScore: 58,
            errorType: 'Mispronunciation',
            phonemes: [phoneme('s', 55), phoneme('k', 90)],
            breakErrorTypes: ['UnexpectedBreak'],
            intonationErrorTypes: [],
            monotonePitchDelta: null,
            l1Tags: ['s_cluster'],
          },
          {
            word: 'asked',
            accuracyScore: 65,
            errorType: 'Mispronunciation',
            phonemes: [phoneme('ae', 70), phoneme('s', 88), phoneme('t', 45)],
            breakErrorTypes: ['UnexpectedBreak'],
            intonationErrorTypes: ['Monotone'],
            monotonePitchDelta: 0.5,
            l1Tags: ['final_consonant'],
          },
        ],
      }],
    });

    const keys = pronunciation.categories.map((category) => category.key);
    expect(keys).toContain('scoreSummary');
    expect(keys).toContain('phonemePatterns');
    expect(keys).toContain('prioritySounds');
    expect(keys).toContain('rhythmIntonation');
    expect(pronunciation.categories.find((category) => category.key === 'prioritySounds')?.items.length).toBeGreaterThan(0);
    expect(pronunciation.categories.find((category) => category.key === 'prosodyDetails')?.items[0]?.tone).toBe('watch');
  });

  it('builds general feedback suggestions, grouped word bank, and active targets', () => {
    const feedback = buildDayGeneralFeedback({
      date: '2026-06-04',
      renderedFeedback: null,
      conclusionJson: {
        date: '2026-06-04',
        overallScore: 7.6,
        totalDurationSecs: 180,
        topicSentence: 'You sounded clearer in strategic updates.',
        pillarScores: { delivery: 7, language: 8, pronunciation: 7.5 },
        metricDeltas: { delivery: null, language: 0.4, pronunciation: -0.1 },
        wins: [],
        struggles: [],
        persistentStruggles: [],
        improvedSinceYesterday: [],
        newVocabSpotted: [],
        focusTomorrow: [{ tag: 'depend on', reason: 'Replace a common Spanish transfer pattern.' }],
        activeTargetsTomorrow: ['depend on'],
        keyInsights: ['Your vocabulary choices were more precise.'],
        tone: 'supportive_neutral',
      },
      wordBankItems: [
        { text: 'depend on', category: 'prepositional_verb', source: 'bank', usageCount: 0, masteryState: 'emerging', isActiveTarget: true },
        { text: 'therefore', category: 'connector', source: 'bank', usageCount: 1, masteryState: 'learning', isActiveTarget: false },
        { text: 'strategic alignment', category: 'collocation', source: 'corpus', usageCount: 0, masteryState: 'emerging', isActiveTarget: false },
        { text: 'smoothly', category: 'adverb', source: 'bank', usageCount: 2, masteryState: 'learning', isActiveTarget: false },
      ],
    });

    expect(feedback.summary).toBe('Your vocabulary choices were more precise.');
    expect(feedback.suggestionWords.map((word) => word.family)).toEqual([
      'collocation',
      'connector',
      'adjectiveAdverb',
      'verb',
    ]);
    expect(feedback.activeTargets[0]).toEqual({
      text: 'depend on',
      reason: 'Replace a common Spanish transfer pattern.',
    });
    expect(feedback.wordBank.map((group) => group.label)).toContain('verb');
  });

  it('builds transcript modes with pronunciation tokens and parses the combined schema', () => {
    const transcript = buildDayTranscript({
      sessions: [{
        id: 'session-1',
        createdAt: new Date('2026-06-04T09:00:00Z'),
        intentLabel: null,
        topic: 'Planning',
        promptUsed: null,
        transcript: {
          text: 'Hello, world!\nAgain',
          improvedText: 'Hello, world. Again.',
          wordCount: 3,
        },
        pronunciationWords: [
          {
            display: 'Hello',
            word: 'hello',
            accuracyScore: 92,
            errorType: 'None',
            wordIndex: 0,
            phonemes: [],
            l1Tags: [],
            breakErrorTypes: [],
            intonationErrorTypes: [],
            monotonePitchDelta: null,
          },
          {
            display: 'world',
            word: 'world',
            accuracyScore: 80,
            errorType: 'Mispronunciation',
            wordIndex: 1,
            phonemes: [],
            l1Tags: ['final_consonant'],
            breakErrorTypes: [],
            intonationErrorTypes: [],
            monotonePitchDelta: null,
          },
          {
            display: 'Again',
            word: 'again',
            accuracyScore: 48,
            errorType: 'Omission',
            wordIndex: 2,
            phonemes: [],
            l1Tags: [],
            breakErrorTypes: [],
            intonationErrorTypes: [],
            monotonePitchDelta: null,
          },
        ],
      }],
    });

    expect(transcript.sessions[0]?.modes.map((mode) => mode.kind)).toEqual([
      'pronunciationMap',
      'yourWords',
      'improved',
    ]);
    const pronunciationTokens = transcript.sessions[0]?.modes[0]?.tokens ?? [];
    expect(pronunciationTokens.some((token) => token.kind === 'punctuation')).toBe(true);
    expect(pronunciationTokens.some((token) => token.kind === 'lineBreak')).toBe(true);
    expect(pronunciationTokens.filter((token) => token.pronunciation !== null).map((token) => token.pronunciation?.scoreBand)).toEqual([
      'green',
      'amber',
      'red',
    ]);

    const sessions = buildDaySessions({
      sessions: [{
        id: 'session-1',
        status: 'DONE',
        createdAt: new Date('2026-06-04T09:00:00Z'),
        durationSecs: 90,
        intentLabel: null,
        topic: 'Planning',
        promptUsed: null,
        transcript: { wordCount: 3 },
        metrics: [],
        pronunciationReport: null,
      }],
    });
    const speechQuality = buildDaySpeechQuality({
      sessions: [],
      naturalnessFlags: [],
      wordBankItems: [],
      sourceAvailability,
    });
    const pronunciation = buildDayPronunciation({ reports: [], sourceAvailability });
    const generalFeedback = buildDayGeneralFeedback({
      date: '2026-06-04',
      renderedFeedback: '',
      conclusionJson: null,
      wordBankItems: [],
    });

    expect(() =>
      DayDetailDataSchema.parse({
        hero: {
          date: '2026-06-04',
          overallScore: 7.5,
          sessionCount: 1,
          totalDurationSecs: 90,
          totalWords: 3,
          focusAreas: ['Grammar'],
          topicSentence: 'You practiced planning.',
          pillarScores: { delivery: 7, language: 8, pronunciation: 7.5 },
        },
        sessions,
        speechQuality,
        pronunciation,
        generalFeedback,
        transcript,
      }),
    ).not.toThrow();
  });
});
