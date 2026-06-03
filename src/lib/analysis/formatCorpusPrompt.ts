// Formats corpus evidence as an XML section for injection into the Claude user prompt
import type { CorpusEvidence } from './analysis.types';

const MAX_VOCAB_ENTRIES = 20;

function formatFreq(freq: number | null): string {
  if (freq === null) return 'n/a';
  return `${freq.toFixed(1)}/M`;
}

function formatVocabularySection(evidence: CorpusEvidence): string {
  const entries = [...evidence.vocabulary.entries()]
    .filter(([, v]) => v.freqPerMillion !== null)
    .sort((a, b) => (b[1].freqPerMillion ?? 0) - (a[1].freqPerMillion ?? 0))
    .slice(0, MAX_VOCAB_ENTRIES);

  if (entries.length === 0) return '';

  const lines = entries.map(([, v]) => {
    const rank = v.rank !== null ? ` rank="${v.rank}"` : '';
    return `    <word lemma="${v.lemma}" cefr="${v.cefr ?? 'unknown'}" freq="${formatFreq(v.freqPerMillion)}"${rank} />`;
  });

  return `  <vocabulary>\n${lines.join('\n')}\n  </vocabulary>`;
}

function formatCollocationsSection(evidence: CorpusEvidence): string {
  const matched = evidence.collocations.filter((c) => c.lookup !== null);
  if (matched.length === 0) return '';

  const lines = matched.map((c) => {
    const l = c.lookup;
    if (l === null) return '';
    const mi = l.mi !== null ? ` mi="${l.mi.toFixed(1)}"` : '';
    const source = l.source ? ` source="${l.source}"` : '';
    return `    <pair head="${c.head}" collocate="${c.collocate}" attested="${String(l.attested)}"${mi}${source} />`;
  });

  return `  <collocations>\n${lines.join('\n')}\n  </collocations>`;
}

function formatExpressionsSection(evidence: CorpusEvidence): string {
  if (evidence.expressions.length === 0) return '';

  const matched = evidence.expressions.filter((e) => e.lookup !== null);
  if (matched.length === 0) return '';

  const lines = matched.map((e) => {
    const l = e.lookup;
    if (l === null) return '';
    const freq = l.freq !== null ? ` freq="${formatFreq(l.freq)}"` : '';
    const cefr = l.cefr !== null ? ` cefr="${l.cefr}"` : '';
    return `    <mwe canonical="${l.canonical}" type="${l.type}"${freq}${cefr} />`;
  });

  return `  <expressions>\n${lines.join('\n')}\n  </expressions>`;
}

function formatStatsSection(evidence: CorpusEvidence): string {
  const s = evidence.stats;
  const cefrDist = Object.entries(s.cefrDistribution)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([level, count]) => `${level}:${count}`)
    .join(' ');

  const avgFreq = s.avgFreqPerMillion !== null ? formatFreq(s.avgFreqPerMillion) : 'n/a';

  return `  <stats content-words="${s.totalContentWords}" matched="${s.matchedWords}" avg-freq="${avgFreq}"\n         cefr-dist="${cefrDist}" />`;
}

const USAGE_INSTRUCTIONS = `
Use this evidence to:
- Ground vocabularyPrecision scoring with actual frequency and CEFR data
- Ground lexicalSophistication scoring with the CEFR distribution (higher C1/C2 % = more sophisticated)
- Confirm or challenge collocation naturalness using MI and attestation data
- When a collocation is attested with MI >= 5, treat it as natural regardless of your initial judgment
- When a collocation is NOT attested, increase scrutiny but do not auto-flag`.trim();

/**
 * Formats corpus evidence as an XML section for injection into the Claude user prompt.
 *
 * Returns an empty string if no evidence is available (all arrays empty).
 *
 * @param evidence - Structured corpus evidence from buildCorpusEvidence.
 * @returns Multi-line XML string ready for prompt injection, or empty string.
 */
export function formatCorpusPrompt(evidence: CorpusEvidence): string {
  const vocab = formatVocabularySection(evidence);
  const collocations = formatCollocationsSection(evidence);
  const expressions = formatExpressionsSection(evidence);

  if (vocab === '' && collocations === '' && expressions === '') {
    return '';
  }

  const sections = [vocab, collocations, expressions, formatStatsSection(evidence)]
    .filter((s) => s.length > 0);

  return [
    'CORPUS EVIDENCE (from frequency databases -- use to ground your scoring):',
    '',
    '<corpus-evidence>',
    ...sections,
    '</corpus-evidence>',
    '',
    USAGE_INSTRUCTIONS,
  ].join('\n');
}
