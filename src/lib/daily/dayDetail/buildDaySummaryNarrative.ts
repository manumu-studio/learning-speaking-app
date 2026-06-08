// Builds a 200–300 word coaching narrative from a DayEvidenceBundle
import { METRIC_LABELS } from '@/features/dashboard/pillars';
import type { DayEvidenceBundle } from './buildDayEvidenceBundle';

function ml(key: string): string {
  return METRIC_LABELS[key] ?? key.replace(/([A-Z])/g, ' $1').trim().toLowerCase();
}

function performanceWord(score: number): string {
  if (score >= 8) return 'strong';
  if (score >= 6) return 'solid';
  if (score >= 4) return 'developing';
  return 'weak';
}

function bestPillar(bundle: DayEvidenceBundle): { name: string; score: number } | null {
  const entries: Array<{ name: string; score: number }> = [];
  if (bundle.pillarScores.delivery !== null) entries.push({ name: 'delivery', score: bundle.pillarScores.delivery });
  if (bundle.pillarScores.language !== null) entries.push({ name: 'language', score: bundle.pillarScores.language });
  if (bundle.pillarScores.pronunciation !== null) entries.push({ name: 'pronunciation', score: bundle.pillarScores.pronunciation });
  if (entries.length === 0) return null;
  return entries.sort((a, b) => b.score - a.score)[0] ?? null;
}

function worstPillar(bundle: DayEvidenceBundle): { name: string; score: number } | null {
  const entries: Array<{ name: string; score: number }> = [];
  if (bundle.pillarScores.delivery !== null) entries.push({ name: 'delivery', score: bundle.pillarScores.delivery });
  if (bundle.pillarScores.language !== null) entries.push({ name: 'language', score: bundle.pillarScores.language });
  if (bundle.pillarScores.pronunciation !== null) entries.push({ name: 'pronunciation', score: bundle.pillarScores.pronunciation });
  if (entries.length === 0) return null;
  return entries.sort((a, b) => a.score - b.score)[0] ?? null;
}

function buildOpening(bundle: DayEvidenceBundle): string {
  const s = bundle.sessionCount === 1 ? 'session' : 'sessions';
  const intensity = bundle.totalWords > 400 ? 'a high-volume' : bundle.totalWords > 150 ? 'a productive' : 'a focused';
  let text = `You had ${intensity} day with ${bundle.sessionCount} ${s} covering ${bundle.totalWords} words.`;
  const parts: string[] = [];
  if (bundle.pillarScores.delivery !== null) parts.push(`delivery ${performanceWord(bundle.pillarScores.delivery)} at ${bundle.pillarScores.delivery.toFixed(1)}`);
  if (bundle.pillarScores.language !== null) parts.push(`language ${performanceWord(bundle.pillarScores.language)} at ${bundle.pillarScores.language.toFixed(1)}`);
  if (bundle.pillarScores.pronunciation !== null) parts.push(`pronunciation ${performanceWord(bundle.pillarScores.pronunciation)} at ${bundle.pillarScores.pronunciation.toFixed(1)}`);
  if (parts.length > 0) text += ` Across the board: ${parts.join(', ')}.`;
  return text;
}

function buildWins(bundle: DayEvidenceBundle): string | null {
  const best = bestPillar(bundle);
  if (best === null) return null;
  const highInsights = bundle.allInsights
    .filter((i) => i.detail.toLowerCase().includes('good') || i.detail.toLowerCase().includes('precise') || i.detail.toLowerCase().includes('strong'))
    .slice(0, 2);
  const highMetrics = bundle.allMetrics.filter((m) => m.score >= 7);
  const topKeys = [...new Set(highMetrics.map((m) => ml(m.key)))].slice(0, 2);

  let text = `Your ${best.name} was the standout at ${best.score.toFixed(1)}/10.`;
  if (highInsights.length > 0) {
    text += ` ${highInsights.map((i) => i.detail).join(' ')}`;
  } else if (topKeys.length > 0) {
    text += ` ${topKeys.join(' and ')} scored particularly well.`;
  }
  text += ' This kind of precision is exactly what moves speaking toward natural fluency.';
  return text;
}

function buildChallenges(bundle: DayEvidenceBundle): string | null {
  const worst = worstPillar(bundle);
  const hasGrammar = bundle.grammarIssues.length > 0;
  const hasNaturalness = bundle.naturalnessFlags.length > 0;
  const weakMetrics = bundle.allMetrics.filter((m) => m.score < 5);
  if (worst === null && !hasGrammar && !hasNaturalness && weakMetrics.length === 0) return null;

  const lines: string[] = [];
  if (worst !== null && worst.score < 7) {
    lines.push(`${worst.name.charAt(0).toUpperCase() + worst.name.slice(1)} needs the most attention right now (${worst.score.toFixed(1)}/10).`);
  }
  if (weakMetrics.length > 0) {
    const names = [...new Set(weakMetrics.map((m) => ml(m.key)))].slice(0, 2);
    lines.push(`Specifically, ${names.join(' and ')} scored below 5 — these are the metrics worth drilling tomorrow.`);
  }
  if (hasGrammar) {
    const rules = [...new Set(bundle.grammarIssues.map((g) => g.rule))].slice(0, 2);
    lines.push(`Grammar flagged ${bundle.grammarIssues.length} issue(s) (${rules.join(', ')}). Each is a small fix, but they accumulate.`);
  }
  if (hasNaturalness) {
    const sample = bundle.naturalnessFlags[0];
    if (sample !== undefined) {
      lines.push(`A naturalness check suggested replacing "${sample.originalPhrase}" with "${sample.suggestedPhrase}" — this kind of swap raises register automatically.`);
    }
  }
  if (lines.length > 0) {
    lines.push('The good news is these are fixable patterns — targeted practice will make a real difference.');
  }
  return lines.length > 0 ? lines.join(' ') : null;
}

function buildCrossPillar(bundle: DayEvidenceBundle): string | null {
  const lang = bundle.pillarScores.language;
  const pron = bundle.pillarScores.pronunciation;
  if (lang === null || pron === null) return null;
  const gap = Math.abs(lang - pron);
  if (gap < 1.5) {
    return 'Language and pronunciation were well-balanced today — your word choices and clarity reinforced each other, which is the ideal pattern for advanced speakers.';
  }
  if (lang > pron) {
    return `Your language choices outpaced pronunciation today (${lang.toFixed(1)} vs ${pron.toFixed(1)}). Strong vocabulary paired with clearer articulation would make your speech significantly more persuasive.`;
  }
  return `Pronunciation was ahead of language today (${pron.toFixed(1)} vs ${lang.toFixed(1)}). Your clarity is strong — investing in richer vocabulary and connectors will catch your language up to your articulation.`;
}

function buildPronunciationNote(bundle: DayEvidenceBundle): string | null {
  const { avgAccuracy, repeatedSounds } = bundle.pronunciationSummary;
  if (avgAccuracy === null) return null;
  let text = `Pronunciation accuracy averaged ${avgAccuracy.toFixed(1)}%.`;
  if (repeatedSounds.length > 0) {
    const sounds = repeatedSounds.slice(0, 3).join(', ');
    text += ` A recurring pattern: ${sounds} appeared as problem sounds across multiple attempts. Focused repetition drills on these will build muscle memory.`;
  } else {
    text += ' No single sound repeated as a problem — keep listening for patterns that emerge over several days.';
  }
  return text;
}

function buildTomorrow(bundle: DayEvidenceBundle): string {
  if (bundle.focusAreas.length === 0) {
    return 'Keep practicing at this intensity — consistency is what converts good sessions into permanent habits.';
  }
  const labels = bundle.focusAreas.slice(0, 3).map(ml);
  return `Tomorrow, prioritize ${labels.join(', ')}. Pick one specific pattern from today's suggestions and use it intentionally in your next session — that deliberate practice is what accelerates real improvement.`;
}

/** Builds a coaching narrative (~200–300 words) from aggregated day evidence. */
export function buildDaySummaryNarrative(bundle: DayEvidenceBundle): string {
  return [
    buildOpening(bundle),
    buildWins(bundle),
    buildChallenges(bundle),
    buildCrossPillar(bundle),
    buildPronunciationNote(bundle),
    buildTomorrow(bundle),
  ].filter((p): p is string => p !== null).join('\n\n');
}
