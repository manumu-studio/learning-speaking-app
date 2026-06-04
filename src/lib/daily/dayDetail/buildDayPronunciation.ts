// Builds the Pronunciation & Intonation hierarchy for a day-detail meta-session
import { aggregatePhonemes } from '@/lib/pronunciation/aggregatePhonemes';
import { rankByFunctionalLoad, splitByPriority } from '@/lib/pronunciation/rankByFunctionalLoad';
import type {
  DayFeedbackItem,
  DayPronunciationCategory,
  DayPronunciationData,
  SourceAvailability,
} from './buildDayDetailData.types';

const IDEAL_WPM_MIN = 110;
const IDEAL_WPM_MAX = 140;
const MAX_ITEMS = 4;

export interface DayPronunciationWordInput {
  readonly word: string;
  readonly accuracyScore: number;
  readonly errorType: string;
  readonly phonemes: unknown;
  readonly breakErrorTypes: readonly string[];
  readonly intonationErrorTypes: readonly string[];
  readonly monotonePitchDelta: number | null;
  readonly l1Tags: readonly string[];
}

export interface DayPronunciationReportInput {
  readonly pronScore: number;
  readonly accuracyScore: number;
  readonly fluencyScore: number;
  readonly completenessScore: number;
  readonly prosodyScore: number;
  readonly speakingRateWpm: number;
  readonly words: readonly DayPronunciationWordInput[];
}

export interface BuildDayPronunciationInput {
  readonly reports: readonly DayPronunciationReportInput[];
  readonly sourceAvailability: SourceAvailability;
}

function average(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function roundedAverage(values: readonly number[]): number | null {
  const avg = average(values);
  return avg === null ? null : Math.round(avg * 10) / 10;
}

function item(title: string, detail: string, tone: DayFeedbackItem['tone'], evidence: string | null): DayFeedbackItem {
  return { title, detail, tone, evidence };
}

function category(input: {
  key: DayPronunciationCategory['key'];
  label: string;
  score: number | null;
  summary: string;
  items: DayFeedbackItem[];
  emptyState: string | null;
}): DayPronunciationCategory {
  return input;
}

function allWords(reports: readonly DayPronunciationReportInput[]): DayPronunciationWordInput[] {
  return reports.flatMap((report) => report.words);
}

function buildScoreSummary(reports: readonly DayPronunciationReportInput[]): DayPronunciationCategory {
  const score = roundedAverage(reports.map((report) => report.pronScore));
  const items = [
    item('Accuracy', `${roundedAverage(reports.map((report) => report.accuracyScore)) ?? 0}% average`, 'neutral', null),
    item('Fluency', `${roundedAverage(reports.map((report) => report.fluencyScore)) ?? 0}% average`, 'neutral', null),
    item('Completeness', `${roundedAverage(reports.map((report) => report.completenessScore)) ?? 0}% average`, 'neutral', null),
    item('Prosody', `${roundedAverage(reports.map((report) => report.prosodyScore)) ?? 0}% average`, 'neutral', null),
  ];
  return category({
    key: 'scoreSummary',
    label: 'Score Summary',
    score,
    summary: score === null ? 'No pronunciation scores available.' : `Pronunciation averaged ${score.toFixed(1)}% today.`,
    items,
    emptyState: score === null ? 'No pronunciation scores available for this day.' : null,
  });
}

function buildPhonemePatterns(words: readonly DayPronunciationWordInput[]): DayPronunciationCategory {
  const phonemes = aggregatePhonemes(words).slice(0, MAX_ITEMS);
  return category({
    key: 'phonemePatterns',
    label: 'Phoneme Patterns',
    score: null,
    summary: phonemes.length === 0 ? 'No repeated weak phoneme pattern surfaced.' : 'Weakest repeated sounds for the day.',
    items: phonemes.map((phoneme) =>
      item(
        phoneme.ipaSymbol,
        `${phoneme.averageScore}% average across ${phoneme.occurrences} occurrence(s).`,
        'watch',
        phoneme.exampleWords.join(', '),
      ),
    ),
    emptyState: phonemes.length === 0 ? 'No repeated weak phoneme pattern surfaced.' : null,
  });
}

function buildPrioritySounds(words: readonly DayPronunciationWordInput[]): DayPronunciationCategory {
  const { priority } = splitByPriority(rankByFunctionalLoad(words));
  return category({
    key: 'prioritySounds',
    label: 'Priority Sounds',
    score: null,
    summary: priority.length === 0 ? 'No high-priority sound pattern was detected.' : 'Highest-impact pronunciation targets.',
    items: priority.slice(0, MAX_ITEMS).map((error) =>
      item(error.label, error.rule, 'watch', `${error.occurrences} occurrence(s), ${error.tier} impact`),
    ),
    emptyState: priority.length === 0 ? 'No high-priority sound pattern was detected.' : null,
  });
}

function prosodyCounts(words: readonly DayPronunciationWordInput[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const word of words) {
    for (const type of [...word.breakErrorTypes, ...word.intonationErrorTypes]) {
      counts.set(type, (counts.get(type) ?? 0) + 1);
    }
  }
  return counts;
}

function buildRhythmIntonation(words: readonly DayPronunciationWordInput[]): DayPronunciationCategory {
  const entries = [...prosodyCounts(words).entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  return category({
    key: 'rhythmIntonation',
    label: 'Rhythm & Intonation',
    score: null,
    summary: entries.length === 0 ? 'No repeated rhythm or intonation issue surfaced.' : 'Top rhythm and intonation patterns.',
    items: entries.map(([type, count]) =>
      item(type, `${count} moment(s) across the day.`, count >= 3 ? 'watch' : 'neutral', null),
    ),
    emptyState: entries.length === 0 ? 'No repeated rhythm or intonation issue surfaced.' : null,
  });
}

function buildProsodyDetails(reports: readonly DayPronunciationReportInput[]): DayPronunciationCategory {
  const averageWpm = roundedAverage(reports.map((report) => report.speakingRateWpm));
  const rateTone = averageWpm !== null && averageWpm >= IDEAL_WPM_MIN && averageWpm <= IDEAL_WPM_MAX ? 'good' : 'watch';
  return category({
    key: 'prosodyDetails',
    label: 'Prosody Details',
    score: roundedAverage(reports.map((report) => report.prosodyScore)),
    summary: averageWpm === null ? 'No speaking-rate data available.' : `Average speaking rate was ${averageWpm} words per minute.`,
    items: averageWpm === null
      ? []
      : [item('Speaking rate', `${averageWpm} WPM`, rateTone, `${IDEAL_WPM_MIN}-${IDEAL_WPM_MAX} WPM target range`)],
    emptyState: averageWpm === null ? 'No speaking-rate data available.' : null,
  });
}

function buildSimpleCategory(
  key: DayPronunciationCategory['key'],
  label: string,
  summary: string,
  items: readonly DayFeedbackItem[],
): DayPronunciationCategory {
  return category({
    key,
    label,
    score: null,
    summary,
    items: [...items],
    emptyState: items.length === 0 ? summary : null,
  });
}

function hasContent(category: DayPronunciationCategory): boolean {
  return category.score !== null || category.items.length > 0 || category.emptyState !== null;
}

/** Builds day-level pronunciation categories without exposing word-level maps. */
export function buildDayPronunciation(input: BuildDayPronunciationInput): DayPronunciationData {
  const reports = input.reports.filter((report) => report.words.length > 0 || report.pronScore >= 0);
  if (reports.length === 0) {
    return {
      categories: [buildSimpleCategory('rhythmIntonation', 'Rhythm & Intonation', 'No pronunciation data for this day.', [])],
      sourceAvailability: input.sourceAvailability,
    };
  }

  const words = allWords(reports);
  const { polish } = splitByPriority(rankByFunctionalLoad(words));
  const prioritySounds = buildPrioritySounds(words);
  const categories = [
    buildScoreSummary(reports),
    buildPhonemePatterns(words),
    prioritySounds,
    buildRhythmIntonation(words),
    buildProsodyDetails(reports),
    buildSimpleCategory('practiceSuggestion', 'Practice Suggestion', 'Practice the highest-impact sound first.', prioritySounds.items.slice(0, 1)),
    buildSimpleCategory('accentPolish', 'Accent Polish', 'Lower-impact polish targets.', polish.slice(0, MAX_ITEMS).map((error) =>
      item(error.label, error.rule, 'neutral', `${error.occurrences} occurrence(s)`),
    )),
  ].filter(hasContent);

  return { categories, sourceAvailability: input.sourceAvailability };
}
