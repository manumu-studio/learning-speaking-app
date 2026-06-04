// Toggle between original and vocabulary-enhanced transcript versions
'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
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
  let cursor = 0;
  return tokens.map((token) => {
    const normalized = normalizeWord(token);
    const current = normalized.length > 0 ? words[cursor] : undefined;
    if (normalized.length > 0) cursor += 1;
    if (current === undefined || normalizeWord(current.display ?? current.word) !== normalized) {
      return { text: token, word: null };
    }
    return { text: token, word: current };
  });
}

function PronunciationMap({
  text,
  words,
}: {
  text: string;
  words: WordPronunciation[];
}) {
  const [expandedWord, setExpandedWord] = useState<WordPronunciation | null>(null);
  const tokens = useMemo(() => buildPronunciationTokens(text, words), [text, words]);

  return (
    <div className="space-y-3">
      <p className="whitespace-pre-wrap">
        {tokens.map((token, index) => {
          if (token.word === null) {
            return <span key={`${token.text}-${index}`}>{token.text}</span>;
          }
          return (
            <button
              key={`${token.text}-${index}`}
              type="button"
              className="rounded px-0.5 text-sky-700 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-950/30"
              onClick={() => setExpandedWord(token.word)}
            >
              {token.text}
            </button>
          );
        })}
      </p>
      {expandedWord !== null && (
        <PhonemeDetail word={expandedWord} onClose={() => setExpandedWord(null)} />
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
