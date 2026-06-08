// Toggle between original and vocabulary-enhanced transcript versions
'use client';

import type { ReactNode } from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { PhonemeDetail } from '@/components/ui/PhonemeDetail';
import { TranscriptComparison } from '@/features/session/TranscriptComparison';
import { useTranscriptToggle } from './useTranscriptToggle';
import type { TranscriptView } from './useTranscriptToggle';
import type { TranscriptToggleProps } from './TranscriptToggle.types';
import type { WordPronunciation } from '@/components/ui/PronunciationSection';

const TOKEN_PATTERN = /(\r\n|\n|\s+|[\p{L}\p{N}'-]+|[^\s\p{L}\p{N}'-]+)/gu;

function normalizeWord(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}'-]/gu, '');
}

function highlightWords(text: string, words: string[]): ReactNode[] {
  if (words.length === 0) return [text];

  const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'));
  const pattern = new RegExp(`\\b(${escaped.join('|')})\\b`, 'giu');

  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null = pattern.exec(text);

  while (match !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <strong key={match.index} className="font-semibold text-sky-600 dark:text-sky-400">
        {match[0]}
      </strong>,
    );
    lastIndex = match.index + match[0].length;
    match = pattern.exec(text);
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

function ToggleButton({
  label,
  active,
  value,
  onSelect,
}: {
  label: string;
  active: boolean;
  value: TranscriptView;
  onSelect: (view: TranscriptView) => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
        active
          ? 'bg-sky-600 text-white'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
      }`}
      onClick={() => onSelect(value)}
    >
      {label}
    </button>
  );
}

interface PronunciationToken {
  readonly text: string;
  readonly word: WordPronunciation | null;
}

function buildPronunciationTokens(text: string, words: readonly WordPronunciation[]): PronunciationToken[] {
  const tokens = text.match(TOKEN_PATTERN) ?? [];
  const aligned = new Map<number, WordPronunciation>();
  let pronCursor = 0;
  const MAX_SCAN = 15;

  for (let i = 0; i < tokens.length && pronCursor < words.length; i += 1) {
    const normalized = normalizeWord(tokens[i] ?? '');
    if (normalized.length === 0) continue;
    for (let scan = 0; scan < MAX_SCAN && pronCursor + scan < words.length; scan += 1) {
      const candidate = words[pronCursor + scan];
      if (candidate !== undefined && normalizeWord(candidate.display ?? candidate.word) === normalized) {
        aligned.set(i, candidate);
        pronCursor = pronCursor + scan + 1;
        break;
      }
    }
  }

  return tokens.map((token, index) => ({
    text: token,
    word: aligned.get(index) ?? null,
  }));
}

const SCORE_BAND_STYLES: Record<string, string> = {
  green: 'text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30',
  amber: 'text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30',
  red: 'text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30',
  grayItalic: 'italic text-gray-400 hover:bg-gray-50 dark:text-gray-500 dark:hover:bg-gray-800',
};

function scoreBandFor(word: WordPronunciation): string {
  const score = word.accuracyScore;
  if (score >= 80) return 'green';
  if (score >= 50) return 'amber';
  return 'red';
}

function PronunciationMap({
  text,
  words,
}: {
  text: string;
  words: WordPronunciation[];
}) {
  const [expandedWord, setExpandedWord] = useState<WordPronunciation | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const tokens = useMemo(() => buildPronunciationTokens(text, words), [text, words]);

  const handleWordClick = useCallback((word: WordPronunciation) => {
    setExpandedWord(word);
    requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }, []);

  return (
    <div className="space-y-3">
      <p className="whitespace-pre-wrap">
        {tokens.map((token, index) => {
          if (token.word === null) {
            return <span key={`${token.text}-${index}`}>{token.text}</span>;
          }
          const band = scoreBandFor(token.word);
          const colorClass = SCORE_BAND_STYLES[band] ?? SCORE_BAND_STYLES.green;
          return (
            <button
              key={`${token.text}-${index}`}
              type="button"
              className={`rounded px-0.5 ${colorClass}`}
              onClick={() => handleWordClick(token.word!)}
            >
              {token.text}
            </button>
          );
        })}
      </p>
      {expandedWord !== null && (
        <div ref={detailRef}>
          <PhonemeDetail word={expandedWord} onClose={() => setExpandedWord(null)} />
        </div>
      )}
    </div>
  );
}

function VocabUpgradeFooter({
  view,
  hasImprovedText,
  wordsUsed,
}: {
  view: TranscriptView;
  hasImprovedText: boolean;
  wordsUsed: string[];
}) {
  if (view !== 'improved' || !hasImprovedText || wordsUsed.length === 0) return null;
  return (
    <p className="text-xs text-slate-400 dark:text-slate-500">
      {wordsUsed.length} vocab {wordsUsed.length === 1 ? 'upgrade' : 'upgrades'} applied
    </p>
  );
}

function TranscriptTabs({
  hasPronunciationMap,
  hasImprovedText,
  hasVerbatim,
  wordCount,
  view,
  selectView,
}: {
  hasPronunciationMap: boolean;
  hasImprovedText: boolean;
  hasVerbatim: boolean;
  wordCount: number | null;
  view: TranscriptView;
  selectView: (view: TranscriptView) => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap" role="tablist" aria-label="Transcript version">
      {hasPronunciationMap && (
        <ToggleButton label="Pronunciation map" active={view === 'pronunciation'} value="pronunciation" onSelect={selectView} />
      )}
      <ToggleButton label="Your words" active={view === 'original'} value="original" onSelect={selectView} />
      {hasImprovedText && (
        <ToggleButton label="Improved" active={view === 'improved'} value="improved" onSelect={selectView} />
      )}
      {hasVerbatim && (
        <ToggleButton label="Compare" active={view === 'compare'} value="compare" onSelect={selectView} />
      )}
      {wordCount !== null && (
        <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">
          {wordCount} words
        </span>
      )}
    </div>
  );
}

function TranscriptPanel({
  originalText,
  highlightedImproved,
  pronunciationWords,
  view,
  hasImprovedText,
}: {
  originalText: string;
  highlightedImproved: ReactNode[];
  pronunciationWords: WordPronunciation[];
  view: TranscriptView;
  hasImprovedText: boolean;
}) {
  if (view === 'pronunciation' && pronunciationWords.length > 0) {
    return <PronunciationMap text={originalText} words={pronunciationWords} />;
  }
  if (view === 'improved' && hasImprovedText) {
    return <p className="whitespace-pre-wrap">{highlightedImproved}</p>;
  }
  return <p className="whitespace-pre-wrap">{originalText}</p>;
}

export function TranscriptToggle({
  originalText,
  improvedText,
  wordsUsed,
  wordCount,
  pronunciationWords = [],
  animationDelay = 0,
  verbatimText,
  verbatimWordCount,
  divergenceSpans,
  verbatimProvider,
}: TranscriptToggleProps) {
  const hasPronunciationMap = pronunciationWords.length > 0;
  const hasImprovedText = improvedText !== null && improvedText.trim().length > 0;
  const comparisonEnabled = process.env.NEXT_PUBLIC_SHOW_TRANSCRIPT_COMPARISON !== 'false';
  const hasVerbatim = comparisonEnabled && verbatimText !== undefined && verbatimText.length > 0;
  const { view, selectView } = useTranscriptToggle(hasPronunciationMap ? 'pronunciation' : 'original');

  const highlightedImproved = useMemo(
    () => (improvedText === null ? [] : highlightWords(improvedText, wordsUsed)),
    [improvedText, wordsUsed],
  );

  return (
    <div
      className="animate-fade-in space-y-3"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <TranscriptTabs
        hasPronunciationMap={hasPronunciationMap}
        hasImprovedText={hasImprovedText}
        hasVerbatim={hasVerbatim}
        wordCount={wordCount}
        view={view}
        selectView={selectView}
      />

      {view === 'compare' && hasVerbatim ? (
        <TranscriptComparison
          whisperText={originalText}
          verbatimText={verbatimText}
          divergenceSpans={divergenceSpans ?? []}
          whisperWordCount={wordCount}
          verbatimWordCount={verbatimWordCount ?? null}
          verbatimProvider={verbatimProvider ?? null}
        />
      ) : (
        <div
          role="tabpanel"
          className="rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          <TranscriptPanel
            originalText={originalText}
            highlightedImproved={highlightedImproved}
            pronunciationWords={pronunciationWords}
            view={view}
            hasImprovedText={hasImprovedText}
          />
        </div>
      )}

      <VocabUpgradeFooter view={view} hasImprovedText={hasImprovedText} wordsUsed={wordsUsed} />
    </div>
  );
}
